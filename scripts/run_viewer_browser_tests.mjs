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
import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, extname, normalize, sep } from "node:path";
import { takeTheBrowserSlot, launchBrowser, slotWaitMs, appendLedgerRow } from "./browser_runner.mjs";
import { CLOCK } from "./virtual_clock.mjs";
import { ranNotDeclared } from "./guard_enumeration.mjs";

process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
// Queues for the machine's browser slot, re-running this file under it, before
// anything below starts a server or a browser (scripts/browser_runner.mjs).
takeTheBrowserSlot();
const SLOT_WAIT_S = slotWaitMs() / 1000;

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
// `{ data: false }` serves the apps and 404s everything under /data/ -- an
// origin that publishes nothing, which is what the annotator's hosted notice
// and folder-grant page are for since it reads over HTTP wherever it can
// (handoff the_scene_pane_is_one_flyout_that_reads_over_http).
function startRepoRootServer(opts) {
  const serveData = !opts || opts.data !== false;
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        const rel = normalize(urlPath).replace(/^[/\\]+/, "");
        if (!serveData && rel.split(sep)[0] === "data") throw new Error("unpublished");
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
// Every sub-check name any suite collected, pass or fail, for the tail's
// `ran ⊆ declared` check against the guard scan (`ranNotDeclared`). Filled at
// the two places a suite reports, which is the only seam every suite shares.
const RAN_NAMES = [];

// Where the tier's wall time goes (handoff the_browser_tier_says_where_its_half_
// hour_goes): one line per suite, slowest first, and a total. The slot is held
// for the whole process, so the wait is one number before the first suite, not
// a per-suite column. A FULL run also appends one row to dispatch's suite-time
// ledger (the file `dispatch suite-time report` reads), carrying the same rows
// under `suites`; a filtered run appends a `partial` row (browser_runner.mjs's
// appendLedgerRow), except under the witness runner, which sets
// TOLSTACK_NO_LEDGER so a mutation per `--only` never touches it. That row IS
// the record of the run -- do not also `suite-time record` this command.

async function reportTimings(timings, runSeconds) {
  const rows = [...timings].sort((a, b) => b.seconds - a.seconds);
  const checks = rows.reduce((n, r) => n + r.checks, 0);
  console.log(`\nTIMING -- ${rows.length} suites, slowest first (slot wait ` +
    `${SLOT_WAIT_S.toFixed(0)}s, before the first suite)`);
  for (const r of rows) {
    console.log(`  ${r.seconds.toFixed(1).padStart(7)}s ${String(r.checks).padStart(4)} checks  ${r.suite}`);
  }
  console.log(`  ${runSeconds.toFixed(1).padStart(7)}s ${String(checks).padStart(4)} checks  TOTAL running`);
  try {
    const seconds = runSeconds + SLOT_WAIT_S;
    const base = { slot_wait_s: Math.round(SLOT_WAIT_S), checks };
    // A filtered run is a partial row, its own tier name so dispatch's report
    // (which reads default|merge|sweep) never counts it as a whole run.
    appendLedgerRow(ONLY !== null
      ? { tier: "partial", seconds, command: `node scripts/run_viewer_browser_tests.mjs --only ${JSON.stringify(ONLY)}`,
          extra: { ...base, scope: "browser", only: ONLY, suite_count: rows.length } }
      : { tier: "merge", seconds, command: "node scripts/run_viewer_browser_tests.mjs",
          extra: { ...base, suites: rows.map((r) => ({ suite: r.suite, checks: r.checks,
            seconds: Math.round(r.seconds * 10) / 10 })) } });
  } catch (err) {
    console.log(`(timing ledger not written: ${err.message})`);
  }
}

function printCollectedFailures(failed, errors) {
  for (const f of failed) console.log(`    FAIL sub-check: ${f.name}`);
  if (errors.length) console.log(`    page errors: ${errors.join(" | ")}`);
}

/** The normal way out: every sub-check ran. */
function reportSuite(label, checks, errors = []) {
  RAN_NAMES.push(...checks.map((c) => c.name));
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
  RAN_NAMES.push(...checks.map((c) => c.name));
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
      return { browser: await launchBrowser(chromium, { channel, headless: true, args }), channel };
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
// A real pointer on the visible START of a cell, with no scroll: a locator's
// hover or click scrolls a cell that does not wholly fit into view, and the
// PART column (since the brackets' label gutter widened it, 2026-11-08) does
// not always fit beside the 3D pane -- a sideways scroll there takes the lit
// dots out of the DAG's view and their leaders with them.
async function onCellStart(page, selector, action) {
  const at = await page.evaluate((sel) => {
    const cell = document.querySelector(sel);
    if (!cell) return null;
    const b = cell.getBoundingClientRect();
    return { x: b.left + Math.min(30, b.width / 2), y: b.top + b.height / 2 };
  }, selector);
  if (!at) return;
  await page.mouse.move(at.x, at.y);
  if (action === "click") await page.mouse.click(at.x, at.y);
}

function navRow(kind, id) {
  return `[data-nav-kind="${kind}"][data-nav-id="${String(id).replace(/"/g, '\\"')}"]`;
}
// Choosing a model (the_model_is_derived_once_and_the_left_column_is_its_tree,
// 2026-11-10): the models are the options of the nav's picker, not rows, so a
// click on a topology row became a choice in the <select>. Its options carry
// the same data-nav-kind / data-nav-id a row did, for the readers above.
const MODEL_PICKER = "#navtree select.navtree__select";
async function pickModel(page, id) {
  await page.waitForSelector(MODEL_PICKER, { timeout: 20000 });
  await page.selectOption(MODEL_PICKER, `topology:${id}`);
}

// ...and a loose stack, the same way: an option after the models.
async function pickStack(page, id) {
  await page.waitForSelector(MODEL_PICKER, { timeout: 20000 });
  await page.selectOption(MODEL_PICKER, `stack:${id}`);
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
// Leaders are OFF by default since 2026-11-10 (one_selection_one_hover_and_
// leaders_off): a suite that reads a leader across the seam turns them on
// first, to the first drawn style (VA.LEADER_STYLE_ON), by the toolbar's own
// control. Returns whether it got there; a page with no toolbar (a stack page)
// has nothing to turn on, and a page whose control is disabled -- the 3D pane
// closed or not side by side (the fixed shell, 2026-11-14), where a leader has
// nowhere to run -- is not clicked.
// Every region back to its top-left (the fixed shell, 2026-11-14): the
// document never scrolls, so "back to the top" is the DAG's and the grid's own
// scrollers.
async function scrollRegionsTop(page) {
  await page.evaluate(() => {
    ["#topopane .tv__hscroll", "#topogrid .tv__gridscroll"].forEach((sel) => {
      document.querySelectorAll(sel).forEach((n) => {
        if (!n.closest(".tv__ghost")) { n.scrollTop = 0; n.scrollLeft = 0; }
      });
    });
  });
}

// Opens the 3D pane and says so or throws. The page remembers open/closed in
// storage and may reopen the pane on its own at boot, so the handle is clicked
// only while the pane is closed; a pane that never opens is this one named
// failure, not a swallowed click and the suite's checks all red downstream.
async function openPaneByHandle(page) {
  if (!(await page.locator("#annotate-flyout[open]").count())) {
    await page.waitForSelector("#pane-handle:visible", { timeout: 15000 });
    // noWaitAfter: the click opens the pane and the page is busy booting the
    // scene, so playwright's wait for "scheduled navigations" outlasts the
    // click's own timeout on a loaded box. The click has landed; the next
    // line is the real wait.
    await page.locator("#pane-handle").click({ timeout: 15000, noWaitAfter: true });
  }
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
  await page.waitForSelector("#annotate-flyout iframe", { state: "attached", timeout: 15000 });
}

async function testTheApp(browser, url, label) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });

  try {
    await page.goto(url + "/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector(MODEL_PICKER, { timeout: 15000 });

    // One stack option, not two: the fixture holds `demo_joint` (which the demo
    // mechanism re-expresses) and `demo_joint_standalone` (which nothing does),
    // and only the second is an entry. One system, one entry. An option of the
    // model picker since 2026-11-10, after the models.
    push("the nav lists exactly the stacks no topology re-expresses",
      await page.locator('option[data-nav-kind="stack"]').count() === 1);
    // The DAG region's Map . Classic switch (2026-11-16) retired with Classic
    // (2026-11-17), so the word is on the page nowhere at all.
    push("and says nothing about a classic view anywhere on the page",
      await page.evaluate(() =>
        !/classic/i.test(document.body.textContent) &&
        !document.getElementById("dag-drawing")));

    // Switch from the default topology mode into stack mode — a real click,
    // which is the one thing this test tier exists to exercise.
    await pickStack(page, "demo_joint_standalone");
    await page.waitForSelector("tr.el-row", { timeout: 15000 });
    push("picking the stack shows it in the picker and hides the toolbar",
      await page.locator(MODEL_PICKER).evaluate((n) => n.value) === "stack:demo_joint_standalone" &&
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

    // Scoped to the ELEMENTS table: the results table below wears the same
    // mark on the three of its five numbers a missing band makes a lower
    // bound (stack_page_check_card_balance_sheet, 2026-09-22), so an unscoped
    // count is a count of both tables.
    push("the zero-width band is marked",
      await page.locator("tr.el-row--zero-width").count() === 1 &&
      await page.locator("table.eltable td.num--zero-width").count() === 2);

    // The loud export/identity fact is the one thing the compact row still
    // carries about the export — everything else moved to the right pane,
    // reached by clicking the row (deliverables 2 and 3 of viewer_consolidation).
    //
    // Since flyout_resize_annotator_filter_and_deselect it rides on the row's
    // ONE consolidated alert badge rather than a filled all-caps chip of its
    // own (Jeff: "roll all the alert badges into one single alert badge"), and
    // both halves of that trade are CSS claims only a layout engine can check:
    // the badge has to be quieter than the filled chip it replaced and still
    // findable.
    //
    // REWRITTEN 2026-09-22 (stack_page_alert_marks_and_drawn_glyph), because
    // the shape it asserted is no longer the shipped one and a stale CSS claim
    // is worse than no claim. Until then the badge was a `.chip--alert` -- a
    // `\u26A0` character in a rounded 1px border -- and "findable" meant a real
    // border in the attention colour. It is a DRAWN triangle with no box now,
    // for the reason the nav rail's is, so what a layout engine has to confirm
    // is:
    //
    //   * the mark is really a picture and really 16px -- the whole point of
    //     the redraw is a size the type scale does not own, and a `width`
    //     attribute with a stylesheet overriding it would measure differently;
    //   * NO BOX. A leftover `.chip` rule matching the badge would put the
    //     border back with the markup unchanged;
    //   * it is the attention colour and not the colour of the chip beside it,
    //     which is now the whole of "findable": `currentColor` means one wrong
    //     cascade and the triangle is body text grey.
    const badge = page.locator("#stackview .rowalert");
    const badgeStyle = await badge.first().evaluate((n) => {
      const cs = getComputedStyle(n);
      const neighbour = getComputedStyle(n.parentNode.querySelector(".chip--kind")
        || n.parentNode.firstElementChild);
      const svg = n.querySelector("svg");
      const box = svg && svg.getBoundingClientRect();
      return {
        background: cs.backgroundColor,
        border: cs.borderTopWidth + " " + cs.borderTopStyle,
        radius: cs.borderTopLeftRadius,
        colour: cs.color,
        paths: n.querySelectorAll("path").length,
        w: box ? Math.round(box.width) : 0,
        h: box ? Math.round(box.height) : 0,
        text: n.textContent,
        neighbourColour: neighbour.color,
        centre: Math.round(box ? box.top + box.height / 2 : 0),
        neighbourCentre: Math.round((() => {
          const b = n.parentNode.querySelector(".chip").getBoundingClientRect();
          return b.top + b.height / 2;
        })()),
      };
    });
    push("the row's alert mark is DRAWN and legible — one path, 16px, no text " +
      `at all (${badgeStyle.w}x${badgeStyle.h})`,
      badgeStyle.paths === 1 && badgeStyle.w >= 14 && badgeStyle.h >= 14 &&
      badgeStyle.w === badgeStyle.h && badgeStyle.text === "");
    push("the row's alert mark is NOT filled and wears no box — the loudness " +
      "Jeff named is gone, and so is the border that was a second mark",
      (badgeStyle.background === "rgba(0, 0, 0, 0)" ||
       badgeStyle.background === "transparent") &&
      badgeStyle.border === "0px none" && badgeStyle.radius === "0px");
    push("...but it is still findable: the attention colour, and not the " +
      "colour of the chip beside it",
      badgeStyle.colour && badgeStyle.colour !== badgeStyle.neighbourColour);
    // WHERE the mark sits, which is what losing the frame made a question: a
    // chip is 21px tall (11px type at the body's line-height, plus padding and
    // a border) and the mark is 16px, so without `align-self: center` the
    // stretch default of `.el-row__chips` leaves the picture at the TOP of a
    // 21px line while the words beside it are centred in theirs. The markup
    // and the class names are identical either way, so this is only visible to
    // a layout engine -- the same shape as the nav rail's "the mark stays at
    // the end of its row", found by looking at the rail rather than at a test.
    //
    // This check replaced a wrong one in the same run it was written in, which
    // is worth keeping: it asserted that a framed mark WOULD have driven the
    // height of the chips beside it (16 + 2 padding + 2 border = 20px against
    // a 15px chip). It measured 21px, so the frame would have cost no height
    // at all and that was never a reason to drop it. The reasons that survive
    // are the two the nav rail's `.navstatus` gave -- a border around the only
    // alert marker on a row is a second mark, and unframed is the one thing in
    // a cell of chips that is different in kind.
    //
    // Non-vacuity, measured rather than assumed (2026-09-22): commenting
    // `align-self: center` out of `.rowalert` reports `602 vs 604` here and
    // this is the only sub-check that moves.
    push(`the mark is centred against the chips beside it, not hung at the ` +
      `top of the line (${badgeStyle.centre} vs ${badgeStyle.neighbourCentre})`,
      Math.abs(badgeStyle.centre - badgeStyle.neighbourCentre) <= 1);

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
      .locator(".rowalert");
    await washerBadge.hover();
    await page.waitForSelector(".hovercard--alerts", { timeout: 5000 });
    const alertCard = await page.locator(".hovercard--alerts").textContent();
    push("hovering the badge opens a card naming the alert in the words the " +
      "row used to shout",
      /FILE NOT IDENTIFIED/.test(alertCard));
    push("...and the card carries the why, which the old chip only had as a " +
      "native tooltip",
      /none hashes to the one/.test(alertCard));
    push("the card names WHICH row it belongs to — the badge is one mark, so " +
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
    // Every export locator here is scoped to the right pane, the way the
    // untraced-row checks are scoped to #stackview: the demo joint carries an
    // established export of its own (fixtures.js), rendered in the stack
    // header, and `textContent()` is strict -- a bare selector would match
    // both and throw instead of reading the element's. Counted first, so a
    // pane with none -- or two -- fails here by name rather than throwing.
    const established = page.locator("#detail .el-export--established");
    push("an established export names its file and its checksum in the right pane",
      await established.count() === 1 &&
      /Read from 215197\.pdf/.test(await established.textContent()) &&
      /pinned to this exact file, by checksum/.test(await established.textContent()));
    push("the crop renders inline in the right pane, not only behind a hover",
      await page.locator(".detail__crop-img").count() === 1);

    // Select the washer (unestablished export) — "impossible to miss" is a CSS
    // claim, and a stylesheet typo would pass any class-name check the DOM shim
    // can make, so the block's tint is asserted on the computed style.
    await selectRow(1);
    const unestablished = page.locator("#detail .el-export--unestablished");
    push("an unestablished export shows its recorded why without a crop",
      await unestablished.count() === 1 &&
      /none hashes to the one/.test(await page.locator("#detail .el-export__why").textContent()));
    const exportBg = await unestablished.first()
      .evaluate((n) => getComputedStyle(n).backgroundColor);
    push("the unestablished export block is tinted",
      exportBg && exportBg !== "rgba(0, 0, 0, 0)");

    // Select the eye (no export block at all) for the "none" spine baseline.
    await selectRow(2);
    const noneSpine = await page.locator("#detail .el-export--none").first()
      .evaluate((n) => getComputedStyle(n).borderLeftColor);

    // Select the grip (the spec-pile identity rule) and compare against it: this
    // row names no export and is right not to, so it must NOT read like the
    // "nothing identifies these bytes" state one row up.
    await selectRow(3);
    const identity = page.locator("#detail .el-export--identity_rule");
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
      await page.locator("tr.rs-row--budget").count() === 1);
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
    await pickModel(page, "demo_mechanism");
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

// What the leaders' zone and the grid rows paint behind them, measured in
// the page: nothing. The alternating bands were removed 2026-11-08
// (the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows), so
// `drawn` -- the band polygons in the rails SVG -- must be 0, and a row's
// background says nothing (below).
// A real pointer on `selector`, at a point the browser says is that element's
// own -- not under a leader's hit path, a rail or the sticky top bar. On the
// product graph (a page thousands of pixels tall, every leader crossing it)
// `locator.click()` is refused by the leader that happens to cross the cell,
// so the point is found rather than
// assumed, the way `railPoint` does for a rail.
//
// Vertically only, then sideways the way a reader would: the grid's sideways
// scroll is put back, and only if the cell is still not the browser's at any
// point is the strip scrolled, as little as brings the cell in, which is what
// a reader does to reach a column the pane does not show. (Until the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_
// what the rails were sticky and the cell was scrolled to just right of
// them; the rails scroll with the grid now.)
async function clearPoint(page, selector, action) {
  const point = await page.evaluate((selector) => {
    const node = document.querySelector(selector);
    if (!node) return null;
    const own = () => {
      const box = node.getBoundingClientRect();
      for (let y = box.top + 2; y < box.bottom - 1; y += 2) {
        for (let x = box.left + 2; x < box.right - 1; x += 6) {
          const hit = document.elementFromPoint(x, y);
          if (hit && (hit === node || node.contains(hit))) return { x, y };
        }
      }
      return null;
    };
    // The region's own scroller: the DAG's or, for a grid cell, the grid's.
    const hscroll = node.closest(".tv__hscroll, .tv__gridscroll");
    const left = hscroll ? hscroll.scrollLeft : 0;
    node.scrollIntoView({ block: "center" });
    if (hscroll) hscroll.scrollLeft = left;
    const found = own();
    if (found || !hscroll) return found;
    // As little as it takes to bring the cell's first 40px in, so as much of
    // the drawing as can stays on screen beside it.
    const edge = hscroll.getBoundingClientRect().right - 8;
    hscroll.scrollLeft += Math.max(0, node.getBoundingClientRect().left + 40 - edge);
    return own();
  }, selector);
  if (!point) {
    // Every point of the cell is under some leader's 14px hit stroke (the
    // product graph's leaders cross the whole page): hand the element the
    // event itself, which is what the handlers on it listen for.
    await page.locator(selector).dispatchEvent(action === "click" ? "click" : "mouseenter");
    return;
  }
  await page.mouse.move(point.x, point.y);
  if (action === "click") await page.mouse.click(point.x, point.y);
}

// --- the topology page, in a real browser ---------------------------------
//
// What this proves that the DOM shim cannot, and it is the deliverable:
//
//   1. EVERY GRID ROW'S EDGE IS ON THE MAP: a row's edge is drawn as its
//      jumper or its connector, across scroll, density and study selection.
//   2. Clicking an SVG mark on the map selects it. A `<g>` with an onclick is
//      exactly the thing a shim reports as working and a stylesheet can break.
//   3. The grid scrolls in its own region and the map pans in its own; the
//      document never scrolls.
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
const CARD_TRIGGER = "tr.tvrow[data-id='base_thickness'] td.tvcell--name";

async function dismissCard(page) {
  await page.mouse.move(4, 4);
  await page.keyboard.press("Escape");
}

// Hover a trigger WITHOUT asking playwright whether anything sits on top of it.
//
// `locator.hover()` refuses to act on an OCCLUDED element: it re-checks the hit
// target, finds something else under the point, and retries until it times out.
// That is the behaviour you want almost everywhere, and it is exactly wrong for
// the out-of-flow contract below -- because the mutation that contract exists to
// catch (`.croppop` back on `position: absolute`,
// `scripts/mutation_witnesses/`) places the open card ON TOP OF the trigger
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
// hatch the retired rails' bar hover took for a different playwright limitation, with the same
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
//     node), and the caller waits on the card.
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
      // "nearest", not "center": the MINIMUM scroll that gets
      // the trigger into the window, which is what locator.hover() did and
      // what keeps the document as scrolled as it can be. In today's layout it
      // is `inline` that does the work (the trigger is off the pane's right
      // edge, not above the window -- see the note above); `block: "nearest"`
      // is the same discipline held on the axis the reading below depends on,
      // so a layout change cannot start giving that scroll away silently.
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      p = box();
    }
    // The stack's own region is what scrolls since the fixed shell
    // (2026-11-14); the document never does.
    const region = document.querySelector("#stackview");
    return p === null ? null : { ...p, scrollY: region ? region.scrollTop : 0 };
  }, selector);
  if (!at) {
    throw new Error(`hoverIgnoringOcclusion: ${selector} resolves to no element ` +
      "with a box inside the window, even after scrolling to it");
  }
  await page.mouse.move(at.x, at.y);
  return at;
}

// --- the popover's own mechanics, on the page that still has popovers ------
//
// (a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark,
// 2026-10-30.) These contracts were measured on the topology grid's EDGE card
// until the marks of the model stopped opening cards. The popover they
// protect is still live -- the elements table's citation card and crop
// popover, the nav's and the tables' alert cards, the kinematic page's limit,
// gap and curve cards all open into the same #croppop node through the same
// showCard/showCrop, position(), replace() and hover-intent corridor -- so the
// contracts move to the stack page's citation card, the tallest card left
// (where-ref, export block and the cited sheet's crop), rather than going with
// the card they were first written on. Each tripwire is re-measured here
// before what it certifies.
//
// The two triggers the corridor needs: a row's citation chip opens its card
// BELOW it, and the same row's alert mark sits just above that card, so a
// pointer coming down onto it is heading into the card and one coming in level
// from the right is not.
const STACK_CARD_CHIP = "#stackview tr.el-row:nth-child(1) span.cardtrig:not(.rowalert)";
const STACK_CARD_TRIGGER = "#stackview tr.el-row:nth-child(1) button.crop-trigger";

async function testPopoverMechanics(browser, url, label) {
  const page = await browser.newPage({ viewport: TOPO_VIEWPORT });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });

  const cardLayout = (triggerSel) => page.evaluate((triggerSel) => {
    const pop = document.querySelector(".croppop");
    const open = pop && getComputedStyle(pop).display !== "none";
    const card = open ? pop.getBoundingClientRect() : null;
    const trig = document.querySelector(triggerSel);
    const trigger = trig ? trig.getBoundingClientRect() : null;
    return {
      docHeight: document.documentElement.scrollHeight,
      cardTop: card ? card.top : null,
      cardBottom: card ? card.bottom : null,
      cardHeight: card ? card.height : null,
      cardScrolls: card ? pop.scrollHeight > pop.clientHeight + 1 : null,
      cardMid: card ? [card.left + card.width / 2, card.top + card.height / 2] : null,
      triggerTop: trigger ? trigger.top : null,
      triggerBottom: trigger ? trigger.bottom : null,
      innerHeight: window.innerHeight,
    };
  }, triggerSel);
  const cropOverlay = () => page.evaluate(() => {
    const fig = document.querySelector(".hovercard .cropblock .cropfig");
    const img = fig && fig.querySelector("img.croppop__img");
    if (!fig || !img) return null;
    const box = (r) => ({ left: r.left, top: r.top, right: r.right,
                          bottom: r.bottom, width: r.width, height: r.height });
    return {
      img: box(img.getBoundingClientRect()),
      ratio: parseFloat(getComputedStyle(fig).getPropertyValue("--crop-ratio")),
      blockWidth: fig.parentElement.getBoundingClientRect().width,
      highlights: Array.from(fig.querySelectorAll(".crophl"))
        .map((n) => box(n.getBoundingClientRect())),
    };
  });
  const dismiss = async () => {
    await page.mouse.move(4, 4);
    await page.keyboard.press("Escape");
  };
  const openChipCard = async (chip) => {
    await page.locator(chip).hover();
    await page.waitForSelector(".hovercard--citation", { state: "visible", timeout: 5000 });
    // A card paints at once and REPAINTS as each of its PNGs resolves, and a
    // repaint can re-place it: settle first.
    await page.waitForTimeout(250);
  };

  try {
    await page.goto(url + "/topology.html?mock=1", { waitUntil: "load" });
    await pickStack(page, "demo_joint_standalone");
    await page.waitForSelector("#stackview tr.el-row", { timeout: 15000 });
    // The second row's chip, whose card opens under the first row's crop
    // trigger; resolved to a selector once, by index, so every check below
    // names the same two elements.
    const CHIP = "#stackview tr.el-row:nth-child(3) span.cardtrig:not(.rowalert)";
    push("the elements table carries the two triggers these contracts are " +
      "measured on", await page.locator(STACK_CARD_CHIP).count() === 1 &&
      await page.locator(CHIP).count() === 1 &&
      await page.locator(STACK_CARD_TRIGGER).count() === 1 &&
      await page.locator("#stackview tr.el-row:nth-child(3) span.rowalert").count() === 1);

    // --- out of flow, capped to the room, reachable -------------------------
    await page.setViewportSize(CARD_CAP_VIEWPORT);
    await page.waitForTimeout(450);
    const before = await cardLayout(STACK_CARD_CHIP);
    await openChipCard(STACK_CARD_CHIP);
    const withCard = await cardLayout(STACK_CARD_CHIP);
    const roomBelow = withCard.innerHeight - withCard.triggerBottom - 16;
    const roomAbove = withCard.triggerTop - 16;
    push("the citation card wants more height than there is room for on " +
      "either side of its chip — the configuration the card-layout contracts " +
      "below are only falsifiable in",
      withCard.cardBottom !== null && withCard.cardScrolls === true &&
      Math.abs(withCard.cardHeight - Math.max(roomAbove, roomBelow)) <= 1);
    push("an open card leaves the document's own height untouched",
      withCard.docHeight === before.docHeight);
    push("the open card's bottom edge is inside the window",
      withCard.cardBottom !== null && withCard.cardBottom <= withCard.innerHeight);
    push("the capped card keeps the overrun reachable in its own scrollport",
      withCard.cardScrolls === true);
    push("the card still sits clear of the trigger it was opened from",
      withCard.cardBottom <= withCard.triggerTop || withCard.cardTop >= withCard.triggerBottom);

    // The highlight overlay points at the crop, not past it.
    const overlay = await cropOverlay();
    push("the open card's crop carries a highlight box to measure, and the " +
      "figure knows the crop's own shape",
      overlay !== null && overlay.highlights.length >= 1 && overlay.ratio > 0);
    push("the card's 260px crop cap really bites here — uncapped this crop " +
      "would be taller than the cap",
      overlay && overlay.blockWidth / overlay.ratio > 260 &&
      Math.abs(overlay.img.height - 260) <= 1.5);
    push("the card's crop element IS the picture — its box still carries the " +
      "crop's own aspect ratio",
      overlay && Math.abs(overlay.img.width / overlay.img.height - overlay.ratio) <
        overlay.ratio * 0.02);
    push("every highlight box on the card lands inside the crop image it " +
      "points into",
      overlay && overlay.highlights.every((h) =>
        h.left >= overlay.img.left - 0.5 && h.right <= overlay.img.right + 0.5 &&
        h.top >= overlay.img.top - 0.5 && h.bottom <= overlay.img.bottom + 0.5));

    await page.mouse.move(withCard.cardMid[0], withCard.cardMid[1]);
    push("and it stays open with the pointer moved off the trigger onto it",
      await page.locator(".croppop").isVisible());
    await page.keyboard.press("Escape");
    push("Escape closes it", !(await page.locator(".croppop").isVisible()));

    // --- placed in the window's frame, with the stack's region scrolled -----
    // The document never scrolls (the fixed shell, 2026-11-14); the stack's
    // elements table scrolls in its own region, which is what can carry a
    // trigger away from where the card was placed.
    await dismiss();
    await page.setViewportSize(CARD_SCROLL_VIEWPORT);
    await page.waitForTimeout(450);
    await page.evaluate((sel) => {
      const chip = document.querySelector(sel);
      const sv = document.querySelector("#stackview");
      sv.scrollTop += chip.getBoundingClientRect().top - sv.getBoundingClientRect().top - 120;
    }, STACK_CARD_CHIP);
    const frame = await page.evaluate(() => {
      const sv = document.querySelector("#stackview");
      return { scrollY: sv.scrollTop, docHeight: sv.scrollHeight, innerHeight: sv.clientHeight };
    });
    push("the stack's region really scrolls at this viewport — the only " +
      "configuration the out-of-flow contract below is falsifiable in",
      frame.docHeight > frame.innerHeight && frame.scrollY >= 24);
    const aimed = await hoverIgnoringOcclusion(page, STACK_CARD_CHIP);
    await page.waitForSelector(".hovercard--citation", { state: "visible", timeout: 5000 });
    const openedAt = await page.evaluate(() => document.querySelector("#stackview").scrollTop);
    push("the card was opened with the stack's region still scrolled, and opening " +
      "it moved the page by nothing", aimed.scrollY >= 24 && openedAt === aimed.scrollY);
    const scrolled = await cardLayout(STACK_CARD_CHIP);
    const gapBelow = scrolled.cardTop - scrolled.triggerBottom;
    const gapAbove = scrolled.triggerTop - scrolled.cardBottom;
    push("an open card is placed in the WINDOW's frame, not the document's — " +
      "it still sits against its trigger with the page scrolled",
      Math.abs(gapBelow - 8) < 1.5 || Math.abs(gapAbove - 8) < 1.5);
    await dismiss();
    await scrollRegionsTop(page);
    await page.setViewportSize(TOPO_VIEWPORT);
    // ...and every scroll the reading above needed is put back, so the
    // corridor below is measured on the table as it first laid out.
    await page.evaluate(() => {
      document.querySelectorAll("#stackview, #stackview *").forEach((n) => {
        if (n.scrollLeft) n.scrollLeft = 0;
        if (n.scrollTop) n.scrollTop = 0;
      });
    });
    await page.waitForTimeout(250);

    // --- reaching an open card with the mouse: the hover-intent corridor -----
    //
    // The competing trigger is the same row's alert mark, beside the chip
    // and a few pixels above the card the chip opens -- inside the corridor's
    // reach, as the topology grid's crop trigger was above its row's citation
    // card. (Row 1's crop trigger, 66px up, is past it: the corridor reads a
    // pointer that far away as not heading for the card, by design.)
    const CORRIDOR_TRIGGER = "#stackview tr.el-row:nth-child(3) span.rowalert";
    const intentMs = await page.evaluate(() => window.ViewerApp.HOVER_INTENT_MS);
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
    }, CORRIDOR_TRIGGER);
    await page.evaluate((sel) => {
      window.__cropTriggerEnteredAt = null;
      document.addEventListener("mouseenter", (e) => {
        if (e.target && e.target.matches && e.target.matches(sel)) {
          window.__cropTriggerEnteredAt = performance.now();
        }
      }, true);
    }, CORRIDOR_TRIGGER);
    const openCitation = async () => {
      await dismiss();
      await openChipCard(CHIP);
      return boxes();
    };
    const lay = await openCitation();
    push("the citation card opens BELOW its row and just under the row's own " +
      "alert mark — the layout the two approaches below are only " +
      "distinguishable in",
      lay.card !== null && lay.card.top > lay.trigger.bottom &&
      lay.card.top - lay.trigger.bottom < 40 &&
      lay.trigger.cx > lay.card.left && lay.trigger.cx < lay.card.right);
    const readSteal = () => page.evaluate(() => ({
      citation: document.querySelectorAll(".hovercard--citation").length,
      crop: document.querySelectorAll(".hovercard--alerts").length,
      sinceEnter: window.__cropTriggerEnteredAt === null ? null
        : performance.now() - window.__cropTriggerEnteredAt,
    }));
    let steal = null, layNow = lay;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) layNow = await openCitation();
      await page.evaluate(() => { window.__cropTriggerEnteredAt = null; });
      await approachFrom(layNow.trigger.cx, layNow.trigger.top - 60,
                         layNow.trigger.cx, layNow.trigger.cy);
      steal = await readSteal();
      if (steal.sinceEnter !== null && steal.sinceEnter < intentMs) break;
    }
    const inWindow = steal.sinceEnter !== null && steal.sinceEnter < intentMs;
    push("a trigger crossed while the pointer is heading for the open card " +
      "does not steal it", inWindow && steal.citation === 1 && steal.crop === 0);
    if (!(inWindow && steal.citation === 1 && steal.crop === 0)) {
      const when = steal.sinceEnter === null ? "with no mouseenter on the trigger"
        : `${Math.round(steal.sinceEnter)}ms after the trigger's mouseenter`;
      console.log(`    read ${when} (window ${intentMs}ms): ` +
        `${steal.citation} citation, ${steal.crop} alerts card(s)`);
    }
    // THE EXPIRY: the pointer stops on that trigger and never reaches the card.
    await page.waitForTimeout(intentMs + 250);
    push("a held trigger the pointer STOPS on opens after the grace period — " +
      "a deferral is a delay, never a card that never arrives",
      await page.locator(".hovercard--alerts").count() === 1);
    // ARRIVAL WINS.
    const lay2 = await openCitation();
    await approachFrom(lay2.trigger.cx, lay2.trigger.top - 60,
                       lay2.trigger.cx, lay2.trigger.cy);
    // Awaited steps, not one stepped move: between this trigger and the card
    // lies the open card's own chip, and a coalesced move can hand the page a
    // pointer that never left the trigger.
    await approachFrom(lay2.trigger.cx, lay2.trigger.cy, lay2.trigger.cx, lay2.card.top + 60);
    await page.waitForTimeout(intentMs + 250);
    push("...and it does NOT open when the pointer arrives at the card " +
      "instead — the reader got where they were going",
      await page.locator(".hovercard--citation").count() === 1 &&
      await page.locator(".hovercard--alerts").count() === 0 &&
      await page.locator(".croppop").isVisible());
    // APPROACH 2 — level, from the right: aimed past the card.
    await approachFrom(lay2.trigger.right + 300, lay2.trigger.cy,
                       lay2.trigger.cx, lay2.trigger.cy);
    push("a trigger hovered while the pointer is moving AWAY from the open " +
      "card opens at once — the guard is intent, not a dead period",
      await page.locator(".hovercard--alerts").count() === 1);

    // --- an open card under the pointer is never re-placed ------------------
    const NUDGE = 4;
    const replaced = () => page.evaluate((nudge) => {
      const pop = document.querySelector("#croppop");
      const img = pop.querySelector("img");
      if (!img) return null;
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
    // The card with a picture in it: the first row's, whose crop resolves.
    await dismiss();
    await openChipCard(STACK_CARD_CHIP);
    const held = await page.evaluate(() => {
      const card = document.querySelector("#croppop").getBoundingClientRect();
      return { x: card.left + card.width / 2, y: card.top + 60 };
    });
    await page.mouse.move(held.x, held.y);
    const onCard = await replaced();
    push("a card with the pointer on it is not re-placed when one of its " +
      "images settles", onCard !== null && onCard.top === onCard.nudged);
    await page.mouse.move(8, 8);
    const offCard = await replaced();
    push("...and it IS re-placed with the pointer off it — the guard is the " +
      "pointer, not an inert code path",
      offCard !== null && offCard.top !== offCard.nudged);
    await dismiss();
  } catch (e) {
    errors.push("harness: " + (e && e.message ? e.message.split("\n")[0] : String(e)));
  } finally {
    await page.close();
  }
  return reportSuite(label, checks, errors);
}

async function testTheTopologyPage(browser, url, label, realProjection, realCrops) {
  const page = await browser.newPage({ viewport: TOPO_VIEWPORT });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });

  // Every grid row's edge is on the map: a dimension's jumper or a gap's
  // connector, keyed by the edge's own id (the map draws every entity once,
  // views/map.js). Since the rails retired (2026-11-17) this is the pairing
  // between the two surfaces; the map is not scrolled with the grid, so no
  // pixel ties them.
  const correspondence = () => page.evaluate(() => {
    const drift = [];
    const rows = Array.from(document.querySelectorAll("#topogrid tr.tvrow"));
    for (const row of rows) {
      if (row.getAttribute("data-row-kind") !== "edge") continue;
      const id = row.getAttribute("data-id");
      const sel = `[data-map-id="${CSS.escape(id)}"]`;
      if (!document.querySelector(`#topopane svg.tv__map g.map__jumper${sel}, ` +
          `#topopane svg.tv__map g.map__connector${sel}`)) {
        drift.push(`edge ${id}: not on the map`);
      }
    }
    return { rows: rows.length, drift };
  });

  // The grid's rows against the page's own plan (the walk with each part's
  // rows gathered, VA.gatherParts): no row painted beyond its body's ink
  // (which is on its cells), every bracket drawn, and the measures the grip
  // checks below compare.
  const GRID_ROWS_IN_PAGE = () => {
    const VA = window.ViewerApp;
    const last = VA.lastTopoRender;
    const proj = VA.findTopology(VA.demoTopologyFixture().topologies, last.topologyId);
    const plan = VA.gridPlan(VA.gatherParts(proj.layout, proj), proj);
    const rows = Array.from(document.querySelectorAll("#topogrid tr.tvrow"));
    const bad = [];
    let provenanceLayers = 0;
    plan.rows.forEach((planRow, r) => {
      const row = rows[r];
      if (!row) { bad.push(`plan row ${planRow.id} has no <tr>`); return; }
      if (row.getAttribute("data-id") !== planRow.id) {
        bad.push(`row ${r} is ${row.getAttribute("data-id")}, the plan says ${planRow.id}`);
      }
      if (/tvrow--body-|tvrow--divide-|tvrow--band-|conf--/.test(row.getAttribute("class") || "")) {
        bad.push(`row ${planRow.id} still wears a tint class: ${row.getAttribute("class")}`);
      }
      const style = getComputedStyle(row);
      if (style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
          !row.classList.contains("tvrow--hot") && !row.classList.contains("tvrow--lead")) {
        bad.push(`row ${planRow.id} is painted ${style.backgroundColor}`);
      }
      if (row.querySelector("span.tvmark--untraced, span.tvmark--no_source_ref")) provenanceLayers++;
    });
    VA.gridBraces(plan, { study: null }).braces.forEach((brace) => {
      const caps = document.querySelectorAll(`#topogrid div.tvbrace[data-brace="${brace.id}"]`);
      if (caps.length < 2) bad.push(`bracket ${brace.id} has ${caps.length} caps`);
    });
    return {
      bad, rows: rows.length, provenanceLayers,
      rowHeights: rows.map((r) => Math.round(r.getBoundingClientRect().height * 100) / 100),
      nameWidth: Math.round(document.querySelector("td.tvcell--name")
        .getBoundingClientRect().width * 100) / 100,
    };
  };

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
    // One drawing in the DAG's region since the rails retired
    // (the_map_is_the_only_drawing_and_classic_retires, 2026-11-17): the map,
    // with no switch beside it, and the grid whole in its own region.
    push("the DAG region draws the map and nothing else, and the grid is whole",
      await page.locator("#topopane svg.tv__map").count() === 1 &&
      await page.locator("#topopane svg.tv__rails").count() === 0 &&
      await page.locator("#dag-drawing").count() === 0 &&
      await page.locator("svg.seamleaders path").count() === 0 &&
      await page.locator("tr.tvrow").count() === 6);
    push("...and a selected node still finds its grid row by the seam it is above",
      await page.evaluate(() => {
        const seams = window.ViewerApp.lastTopoRender.boundaryEdge || {};
        return Object.keys(seams).length === 5 && seams.base_post_seat !== undefined;
      }));

    push("the map renders as SVG, not as unknown HTML elements",
      await page.locator("svg.tv__map g.map__pin circle").count() > 0 &&
      await page.locator("svg.tv__map g.map__jumper path").count() > 0 &&
      await page.locator("svg.tv__map g.map__connector path").count() > 0);

    // The merged-row grid: the demo mechanism has six edges, each with its
    // own part cell (the_grid_fits_the_screen_and_its_brackets_say_what_
    // nests_in_what).
    push("the grid holds one row per edge, each with its own part cell",
      await page.locator("tr.tvrow").count() === 6 &&
      await page.locator("td.tvcell--part").count() === 6);
    const first = await correspondence();
    push("every grid row's edge is drawn on the map, as its jumper or its connector",
      first.rows > 0 && first.drift.length === 0);
    if (first.drift.length) console.log("    drift: " + first.drift.slice(0, 5).join(" | "));

    // --- the Preview's DEFAULT, and a divider a reader can find ------------
    //
    // (deliverable 5, viewer_hover_deslop_and_banner_purge, 2026-09-16; under
    // the grid since the fixed shell, 2026-11-14.) Asserted at all because the
    // deliverable is a few CSS declarations: reverting them undid it in full
    // with every tier still green (review, measured).
    //
    // It must run BEFORE anything drags a divider: a remembered size is
    // written as an inline style over the stylesheet's rule, and this is a
    // reading of the RULE.
    const paneAtRest = await page.evaluate(() => {
      const detail = document.querySelector("#detail");
      const column = document.querySelector(".tv__main");
      const divider = document.querySelector("#detail-divider");
      const grid = document.querySelector("#topogrid");
      let remembered = null;
      try {
        remembered = window.localStorage.getItem(window.ViewerApp.PREVIEW_HEIGHT_KEY);
      } catch { remembered = null; }
      const d = detail.getBoundingClientRect();
      const g = grid.getBoundingClientRect();
      return {
        height: d.height, columnHeight: column.getBoundingClientRect().height,
        width: d.width, columnWidth: column.getBoundingClientRect().width,
        belowGrid: d.top >= g.bottom - 0.5,
        inlineHeight: detail.style.height,
        remembered,
        hairline: getComputedStyle(divider, "::before").backgroundColor,
        grip: getComputedStyle(divider, "::after").backgroundImage,
        gripPosition: getComputedStyle(divider, "::after").position,
      };
    });
    // The tripwire, before what it certifies.
    push("nothing is remembered and nothing is inline, so the Preview's height " +
      "here IS the stylesheet's default",
      paneAtRest.remembered === null && paneAtRest.inlineHeight === "");
    push("the Preview sits under the grid, the column's width, at its default " +
      "share of the column's height",
      paneAtRest.belowGrid && Math.abs(paneAtRest.width - paneAtRest.columnWidth) <= 1 &&
      paneAtRest.height >= 0.3 * paneAtRest.columnHeight &&
      paneAtRest.height <= 0.5 * paneAtRest.columnHeight + 1);
    // The divider announces itself at rest. Both halves: the seam, which was
    // `transparent` until hover and so invisible to anyone who did not already
    // know it was there, and the grip mark that says the seam is a HANDLE.
    push("the pane's divider is visible at rest, not only under the pointer",
      paneAtRest.hairline !== "rgba(0, 0, 0, 0)" &&
      paneAtRest.hairline !== "transparent");
    push("...and carries a grip mark, centred on the seam it sits on",
      paneAtRest.grip !== "none" && paneAtRest.gripPosition === "absolute");

    // 3) scrolled, the grid stays whole in its own region and the document
    //    does not move; every row's edge is still on the map.
    await page.evaluate(() => {
      document.querySelector("#topogrid .tv__gridscroll").scrollTop = 40;
    });
    const scrolled = await correspondence();
    push("correspondence holds after scrolling", scrolled.drift.length === 0 &&
      await page.evaluate(() => document.scrollingElement.scrollTop === 0));
    await page.evaluate(() => {
      document.querySelector("#topogrid .tv__gridscroll").scrollTop = 0;
    });

    // 2) a real click on an interface: the shared seat's connector on the
    //    map (the rails' dot until 2026-11-17).
    const seat = 'svg.tv__map g.map__connector[data-map-id="base_post_seat"]';
    await page.locator(seat).dispatchEvent("click");
    await page.mouse.move(4, 4);
    push("clicking an interface's connector on the map opens that interface in the preview pane",
      /An interface is a location, not a value/
        .test(await page.locator("#detail").textContent()));
    push("the clicked connector is visibly marked — the grid has no node rows",
      await page.locator("svg.tv__map g.map__connector.map__connector--selected").count() === 1 &&
      await page.locator("tr.tvrow--selected").count() === 0);

    // No crop on a row (the_grid_fits_the_screen_and_its_brackets_say_what_
    // nests_in_what): the crop is the Preview's, at the pane's width.
    push("no grid row draws a crop image or a crop word",
      await page.locator("#topogrid tr.tvrow img").count() === 0 &&
      await page.locator("#topogrid tr.tvrow .crop-trigger").count() === 0);

    // --- the Preview: one record behind every mark (a_preview_pane_replaces_
    // the_hover_popups_and_one_record_backs_every_mark) ------------------------
    //
    // Real pointers over real geometry, which is the half the DOM shim cannot
    // drive: a hover over a mark on either tier writes that mark's record into
    // the right-hand pane's Preview; a click freezes it; a hover over another
    // mark previews that one for as long as the pointer is on it; leaving
    // hands the Preview back to the frozen element; Escape lets go.
    await page.keyboard.press("Escape");
    await page.mouse.move(4, 4);
    const returnMs = await page.evaluate(() => window.ViewerApp.PREVIEW_RETURN_MS);
    const previewIs = (state, key) => page.waitForFunction(([state, key]) => {
      const p = document.querySelector(".detail__preview");
      return !!p && p.getAttribute("data-preview-state") === state &&
        (key === null || p.getAttribute("data-preview-key") === key);
    }, [state, key], { timeout: 5000 }).then(() => true).catch(() => false);
    const preview = () => page.evaluate(() => {
      const p = document.querySelector(".detail__preview");
      if (!p) return null;
      const head = p.querySelector(".detail__previewhead");
      const body = p.querySelector(".detail__previewbody");
      return { state: p.getAttribute("data-preview-state"),
               key: p.getAttribute("data-preview-key"),
               head: head ? head.textContent : "", pinned: !!p.querySelector(".detail__unpin"),
               body: body ? body.textContent : "",
               images: body ? body.querySelectorAll("img").length : 0 };
    });
    const leave = async () => {
      await page.mouse.move(4, 4);
      await page.waitForTimeout(returnMs + 120);
    };
    const rowFor = (id) => `tr.tvrow[data-id='${id}']`;
    // An interface's mark on the map: a node two parts share is its
    // connector, a node on one part that part's pin (views/map.js).
    const markFor = (id) => `svg.tv__map [data-map-id="${id}"]`;
    // A real pointer onto a map mark, a quarter of the way along a
    // connector or a jumper (its box's centre is its symbol, which hovers the
    // same group -- the map's own lesson) and at a pin's centre.
    const hoverMark = async (sel) => {
      const at = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const path = el.querySelector("path.map__connectorhit, path.map__jumperhit");
        if (path) {
          const p = path.getPointAtLength(path.getTotalLength() / 4);
          const m = path.getScreenCTM();
          return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
        }
        // A pin's group box holds its label too: aim at the dot.
        const dot = el.querySelector("circle.map__pindot, rect.map__pinmark") || el;
        const b = dot.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }, sel);
      if (at) await page.mouse.move(at.x, at.y);
      return !!at;
    };
    // A row is hovered on its own visible cells (its PART cell).
    const hoverRow = async (id) => {
      const at = await page.evaluate((sel) => {
        const row = document.querySelector(sel);
        if (!row) return null;
        // The PART cell: on screen at the suite's width since the brackets'
        // label gutter widened it (the labels over it take no pointer).
        const cell = row.querySelector("td.tvcell--part") || row;
        const b = cell.getBoundingClientRect();
        return { x: b.left + Math.min(30, b.width / 2), y: b.top + b.height / 2 };
      }, rowFor(id));
      if (at) await page.mouse.move(at.x, at.y);
      return !!at;
    };

    push("with nothing selected and nothing pointed at, the Preview says so " +
      "in one line", await previewIs("empty", "") &&
      /Point at a part, a pin, a line or a row/.test((await preview()).body));

    // A grid row previews its edge: the crop at a legible size, the part in
    // its own words, the citation.
    await hoverRow("base_thickness");
    push("hovering a grid row previews its record — the crop, the part and " +
      "the citation", await previewIs("hover", "edge|base_thickness") &&
      await (async () => {
        const p = await preview();
        return /base plate thickness/.test(p.body) && /a dimension of 215197 base plate/.test(p.body) &&
          /215197/.test(p.body) && p.images >= 1 && !p.pinned;
      })());
    const rowPreview = (await preview()).body;
    // The Preview is the one place a crop may be large: wider than the 260px
    // the hover card capped it at.
    const crop = await page.evaluate(() => {
      const img = document.querySelector(".detail__previewbody .detail__crop img.detail__crop-img");
      return img ? img.getBoundingClientRect().width : 0;
    });
    push("the Preview draws the crop wider than the retired card's 260px cap",
      crop > 260);
    push("no popover opens on a mark's hover", !(await page.locator(".croppop").isVisible()));

    // The same edge's own jumper on the map previews the same record,
    // character for character: one edge, two marks, one record.
    const barHovered = await hoverMark('svg.tv__map g.map__jumper[data-map-id="base_thickness"]') &&
      await previewIs("hover", "edge|base_thickness");
    push("hovering the edge's jumper on the map previews the edge's record", barHovered === true);
    push("the jumper's Preview and the same edge's row's Preview are the same " +
      "record, character for character", (await preview()).body === rowPreview);
    await leave();
    push("leaving every mark empties the Preview", await previewIs("empty", ""));

    // A boundary interface: both parts named, the one with a crop pictured.
    await hoverMark(markFor("base_post_seat"));
    push("hovering a boundary interface previews the parts that meet there, with " +
      "the picture only where one resolves",
      await previewIs("hover", "node|base_post_seat") && await (async () => {
        const p = await preview();
        // The side's label says the number (`215197 base plate`, the one label
        // rule), so the record prints no second `drawing 215197` line under it.
        return /215197 base plate ⇔ post/.test(p.body) && /mating surface/.test(p.body) &&
          !/drawing 215197/.test(p.body) &&
          await page.locator(".detail__previewbody div.detail__side img").count() === 1;
      })());
    await hoverMark(markFor("base@base_datum"));
    push("an internal interface's Preview says it is internal",
      await previewIs("hover", "node|base_datum") &&
      /An internal interface/.test((await preview()).body));
    await hoverMark(markFor("arm@arm_tip"));
    push("an interface with no croppable side names the clearance and shows no image",
      await previewIs("hover", "node|arm_tip") && await (async () => {
        const p = await preview();
        return /a clearance/.test(p.body) && p.images === 0;
      })());

    // FREEZE on an interface: click A; hover B shows B under A's pin; leave,
    // A again; Escape, nothing.
    await hoverMark(markFor("base_post_seat"));
    await page.mouse.down();
    await page.mouse.up();
    push("clicking an interface freezes the Preview on it, pinned and named in the " +
      "section head", await previewIs("frozen", "node|base_post_seat") && await (async () => {
        const p = await preview();
        return p.pinned && /base \/ post seat/.test(p.head);
      })());
    await hoverMark('svg.tv__map g.map__jumper[data-map-id="base_thickness"]');
    push("with A frozen, hovering B previews B — and A stays named under the pin",
      await previewIs("hover", "edge|base_thickness") && await (async () => {
        const p = await preview();
        return p.pinned && /base \/ post seat/.test(p.head) && /base plate thickness/.test(p.body);
      })());
    await leave();
    push("leaving the marks hands the Preview back to the frozen A",
      await previewIs("frozen", "node|base_post_seat"));
    await page.keyboard.press("Escape");
    push("Escape lets go: nothing frozen, nothing selected",
      await previewIs("empty", "") &&
      await page.locator("svg.tv__map .map__connector--selected").count() === 0);

    // FREEZE on a grid row, the same four steps.
    await onCellStart(page, rowFor("base_thickness") + " td.tvcell--part", "click");
    push("clicking a grid row freezes the Preview on its edge",
      await previewIs("frozen", "edge|base_thickness"));
    await hoverRow("post_height");
    push("with a row frozen, hovering another row previews that one",
      await previewIs("hover", "edge|post_height") && (await preview()).pinned);
    await leave();
    push("...and leaving returns to the frozen row",
      await previewIs("frozen", "edge|base_thickness"));
    // Keyboard parity: focus previews exactly like hover.
    await page.locator(markFor("strut@strut_end")).focus();
    push("focusing a mark previews it the way hovering does",
      await previewIs("hover", "node|strut_end"));
    await page.locator(markFor("strut@strut_end")).evaluate((n) => n.blur());
    await page.waitForTimeout(returnMs + 120);
    // A click on the map's empty space lets go too.
    const blank = await page.evaluate(() => {
      const svg = document.querySelector("#topopane svg.tv__map");
      const b = svg.getBoundingClientRect();
      for (let y = b.top + 4; y < Math.min(b.bottom, window.innerHeight) - 4; y += 6) {
        for (let x = b.left + 3; x < b.right - 3; x += 40) {
          const hit = document.elementFromPoint(x, y);
          if (hit === svg) return { x, y };
        }
      }
      return null;
    });
    if (blank) await page.mouse.click(blank.x, blank.y);
    push("a click on the map's empty space lets the frozen Preview go",
      !!blank && await previewIs("empty", ""));

    // Every focusable mark is NAMED.
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll("svg.tv__map [tabindex], tr.tvrow")]
        .filter((n) => !(n.getAttribute("aria-label") || "").trim()).length);
    push("every focusable mark on both surfaces carries an accessible name", unnamed === 0);
    await onCellStart(page, rowFor("base_thickness") + " td.tvcell--part", "click");
    await page.keyboard.press("Escape");
    await page.mouse.move(4, 4);

    // Whatever the clicks above scrolled is put back: the checks below measure
    // from the pane's and the page's resting scroll.
    await page.evaluate(() => {
      ["#topopane .tv__hscroll", "#topogrid .tv__gridscroll"].forEach((sel) => {
        const n = document.querySelector(sel);
        if (n) { n.scrollLeft = 0; n.scrollTop = 0; }
      });
    });

    // Study selection, through the nav tree: an EMPHASIS change, not a view
    // switch. The map draws the whole model before and after (a study lit as
    // a route on the map is a later handoff), and the grid drops to the
    // chain's rows.
    const mapShape = () => page.evaluate(() => ({
      boxes: document.querySelectorAll("svg.tv__map rect.map__box").length,
      pins: document.querySelectorAll("svg.tv__map g.map__pin").length,
      jumpers: document.querySelectorAll("svg.tv__map g.map__jumper").length,
      connectors: document.querySelectorAll("svg.tv__map g.map__connector").length,
    }));
    const walkShape = await mapShape();
    const walkRows = await page.locator("tr.tvrow").count();
    await page.locator(navRow("study", "demo_strut_branch")).click();
    await page.waitForSelector("tfoot.tvfoot", { timeout: 5000 });
    const litShape = await mapShape();
    push("selecting a study hides nothing on the map: every box, pin, jumper and " +
      "connector the model drew is still on screen",
      walkShape.boxes > 0 && JSON.stringify(litShape) === JSON.stringify(walkShape));
    if (JSON.stringify(litShape) !== JSON.stringify(walkShape)) {
      console.log("    walk " + JSON.stringify(walkShape) +
                  " vs study " + JSON.stringify(litShape));
    }
    const chained = await correspondence();
    push("with a study selected every grid row's edge is still on the map",
      chained.drift.length === 0);
    if (chained.drift.length) console.log("    drift: " + chained.drift.slice(0, 5).join(" | "));
    push("the grid is exactly the chain, and shorter than the walk's table",
      chained.rows === 3 && chained.rows < walkRows);
    // The balance sheet (viewer_summary_balance_sheet, 2026-09-22): the
    // rolled-up numbers are rows of the CONTRIBUTIONS TABLE, under the
    // members they total and in the same columns. A chip strip could line up
    // with nothing; this is the claim that replaced it, and only a real
    // browser can measure it.
    const totalsAlign = await page.evaluate(() => {
      const cell = (sel) => document.querySelector(sel);
      const box = (n) => (n ? n.getBoundingClientRect() : null);
      const memberMin = box(document.querySelector("tr.tvrow td.tvcell--min"));
      const totalMin = box(cell("tr.tvtotal--worst_case td.tvcell--min"));
      const table = cell("tr.tvtotal--worst_case").closest("table");
      return {
        rows: document.querySelectorAll("tfoot.tvfoot tr.tvtotal").length,
        sameTable: table === document.querySelector("tr.tvrow").closest("table"),
        drift: memberMin && totalMin
          ? Math.abs(memberMin.right - totalMin.right) : null,
        margins: document.querySelectorAll(".tvtotal__margin").length,
        strips: document.querySelectorAll(".tvtotals__strip, .chip--total").length,
      };
    });
    push("the totals are rows of the contributions grid, not a strip beside it",
      totalsAlign.sameTable && totalsAlign.rows >= 3 && totalsAlign.strips === 0);
    push("a total lands in the column it totals, to the pixel",
      totalsAlign.drift !== null && totalsAlign.drift < 0.5);
    if (totalsAlign.drift === null || totalsAlign.drift >= 0.5) {
      console.log("    totals column drift: " + JSON.stringify(totalsAlign));
    }
    await page.locator(".tvtotals__more summary").click();
    push("the totals say where the numbers came from, behind the Details toggle",
      /This page adds nothing up/.test(await page.locator("#totals").textContent()));

    // Deselecting gives the walk its own table back.
    await pickModel(page, "demo_mechanism");
    await page.waitForSelector("tr.tvrow", { timeout: 5000 });
    push("deselecting restores the walk's own rows",
      JSON.stringify(await mapShape()) === JSON.stringify(walkShape) &&
      await page.locator("tr.tvrow").count() === walkRows);

    // A study that refuses to sum shows the refusal, with its next step.
    await page.locator(navRow("study", "demo_ambiguous")).click();
    await page.waitForSelector(".tverror", { timeout: 5000 });
    const refusal = await page.locator("#totals").textContent();
    push("a BranchAmbiguity renders as a result, not as a blank",
      /The selection reaches a fork/.test(refusal) &&
      /still unused/.test(refusal) &&
      await page.locator("tfoot.tvfoot").count() === 0);

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
    await page.waitForSelector("tfoot.tvfoot", { timeout: 5000 });
    push("the anchor: a study that sums really drops the grid to its chain first",
      await page.locator("tr.tvrow").count() < walkRows);
    await page.locator(navRow("study", "demo_ambiguous")).click();
    await page.waitForSelector(".tverror", { timeout: 5000 });
    push("a refusing study leaves the grid the whole walk rather than a chain it " +
      "has not got",
      await page.locator("tr.tvrow").count() === walkRows &&
      JSON.stringify(await mapShape()) === JSON.stringify(walkShape));

    // Back to the deselected walk for the rest of this suite. A refusing
    // study and no selection draw the same page (that is the check above), so
    // this changes nothing a reader would see -- but it does keep the blocks
    // below measuring a page whose STATE is the one they describe, rather
    // than one that merely looks like it.
    await pickModel(page, "demo_mechanism");
    await page.waitForSelector("tr.tvrow", { timeout: 5000 });

    // The legend dialog: a help affordance, not layout — closed by default,
    // opens on a real click, and does not affect the DAG pane's own box.
    push("the legend dialog is closed by default",
      !(await page.locator("#legend-dialog").evaluate((n) => n.open)));
    await page.locator("#legend-toggle").click();
    await page.waitForSelector("#legend-dialog[open]", { timeout: 5000 });
    push("the legend opens on a real click",
      await page.locator("#legend-dialog").evaluate((n) => n.open));
    await page.locator("#legend-close").click();
    push("its own close button closes it",
      !(await page.locator("#legend-dialog").evaluate((n) => n.open)));

    // The demo mechanism's own joint is `{}` (it spans four parts, no single
    // physical joint) — the "stays silent" half of deliverable 4
    // (viewer_v2_single_nav), on the fixture the rest of this suite already
    // loaded.
    push("a topology with no joint block says so rather than fabricating one",
      /no joint block/.test(await page.locator("#topojoint").textContent()));
    // It declares no worksheet either, so with no study selected there is no
    // toggle. The worksheet and the joint are detail of the SELECTED STUDY
    // (a_study_shows_the_worksheet_and_joint_of_the_stack_it_folds): the
    // fixture's `demo_strut_branch` carries the `demo_joint` stack, so
    // selecting it offers that stack's sheet and renders its joint block. The
    // dialog names the file it is showing, so a reader is never left
    // wondering whose sheet they are reading.
    push("with no study selected, a topology with no sheet of its own offers none",
      !(await page.locator("#worksheet-toggle").isVisible()));
    await page.locator(navRow("study", "demo_strut_branch")).click();
    await page.waitForSelector("tfoot.tvfoot", { timeout: 5000 });
    push("a study whose chain re-expresses a stack shows that stack's joint block",
      /DETAIL B/.test(await page.locator("#topojoint").textContent()));
    // Guarded rather than clicked blind: a page that offers no toggle here is
    // a red check, not a suite that times out on the click.
    const studySheetOffered = await page.locator("#worksheet-toggle").isVisible();
    let sheet = "";
    if (studySheetOffered) {
      await page.locator("#worksheet-toggle").click();
      await page.waitForSelector("#worksheet-dialog[open]", { timeout: 5000 });
      sheet = await page.locator("#worksheet-dialog").textContent();
    }
    push("...and offers the sheet that stack authored, and names it",
      studySheetOffered && /WORKSHEET_demo_joint\.md/.test(sheet));
    push("and renders that sheet's own body, not an empty pane",
      /Demo worksheet/.test(sheet));
    if (studySheetOffered) await page.locator("#worksheet-close").click();
    // Back to the deselected walk, which the blocks below measure.
    await pickModel(page, "demo_mechanism");
    await page.waitForSelector("tr.tvrow", { timeout: 5000 });
    push("leaving the study takes its joint block with it",
      /no joint block/.test(await page.locator("#topojoint").textContent()));

    // --- the grid's rows and its column grips (viewer_leader_grid_
    // legibility) ------------------------------------------------------------
    const bands = () => page.evaluate(GRID_ROWS_IN_PAGE);
    const restBands = await bands();
    push("no grid row is painted, every bracket is drawn, and every row is the plan's",
      restBands.bad.length === 0 && restBands.rows > 0);
    if (restBands.bad.length) console.log("    rows: " + restBands.bad.slice(0, 5).join(" | "));

    // The ELEMENT column: widening it must reveal more text and change NO
    // row's height -- a <tr>'s height is a floor, not a cap, so a cell that
    // wrapped instead of clipping would walk every seam below it off its
    // leader. That is the one thing only a real browser can measure.
    const colGrip = page.locator('.tvgrip--col[data-resize="column:name"]');
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

    // The width survives a re-render at the other density -- it is how the
    // page is drawn, not a fact about what is on it.
    await page.locator("#density-toggle").click();
    await page.waitForTimeout(50);
    const afterDensity = await bands();
    push("the resized column width survives a re-render at the other density",
      Math.abs(afterDensity.nameWidth - afterCol.nameWidth) < 0.5);
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
      // One topology since 2026-10-27: the L1 grip stack is a subset of the
      // product model, and its study is how a reader reaches it.
      push("[real] the product model is offered, with the L1 grip study under it",
        ids.includes("vpa_pitch_linkage") &&
        realProjection.topologies.find((t) => t.id === "vpa_pitch_linkage")
          .studies.some((st) => st.id === "vpa_output_shank_out"));

      for (const topology of realProjection.topologies) {
        await pickModel(page, topology.id);
        await page.waitForSelector("tr.tvrow", { timeout: 5000 });
        const expected = topology.edges.length;
        push(`[real] ${topology.id} renders all ${expected} edge rows`,
          await page.locator("tr.tvrow").count() === expected);
        // The render honours its own plan — group cells match VA.gridPlan
        // over the live walk as the page orders it (each part's rows
        // gathered), so a renderer that dropped a group would fail here even
        // though the plan itself is pinned at the fixture tier.
        const planMatch = await page.evaluate((topologyId) => {
          const VA = window.ViewerApp;
          const proj = VA.findTopology(VA.demoTopologyFixture().topologies, topologyId);
          const plan = VA.gridPlan(VA.gatherParts(proj.layout, proj), proj);
          // One part cell per row, its words on each group's first row only
          // (the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what).
          const rows = Array.from(document.querySelectorAll("#topogrid tr.tvrow--edge"));
          const bad = [];
          if (rows.length !== plan.rows.length) {
            bad.push(`rows: ${rows.length} drawn vs ${plan.rows.length} planned`);
          }
          plan.groups.forEach((g, i) => {
            for (let k = 0; k < g.count; k++) {
              const row = rows[g.start + k];
              const cell = row && row.querySelector("td.tvcell--description");
              if (!cell) { bad.push(`group ${i} row ${k}: no description cell`); continue; }
              if ((k === 0) !== (cell.textContent !== "")) {
                bad.push(`group ${i} (${g.label}) row ${k}: "${cell.textContent}"`);
              }
            }
          });
          return bad;
        }, topology.id);
        push(`[real] ${topology.id}'s groups match its plan`,
          planMatch.length === 0);
        if (planMatch.length) console.log("    plan: " + planMatch.slice(0, 5).join(" | "));
        const drift = await correspondence();
        push(`[real] ${topology.id} draws every row's edge on its map`,
          drift.drift.length === 0 &&
          await page.locator("#topopane svg.tv__map").count() === 1);
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
        if (topology.id === "vpa_pitch_linkage" && topology.worksheet_file) {
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

        // The per-study loop reads the projection through
        // `demoTopologyFixture`, so nothing in it depends on the origin: it
        // runs on the http origin (the one Jeff reads) and not on file://,
        // where it was ~8 s per study click for the same assertions.
        const studiesHere = url.startsWith("file:") ? [] : topology.studies;
        for (const study of studiesHere) {
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
          if (study.status !== "ok") {
            push(`[real] ${study.id} shows its refusal`,
              /does not sum|reaches a fork|not one chain|closes a ring|unlike things/
                .test(await page.locator("#totals").textContent()));
            continue;
          }
          // The GRID's own totals footer since 2026-09-22, not the pane
          // below it. Value for value against the projection — the page's
          // own rule sentence claims exactly this, and a `toFixed` sneaking
          // into a view is precisely how it would stop being true.
          const totals = await page.locator("tfoot.tvfoot").textContent();
          const fields = ["nominal", "worst_case_min", "worst_case_max",
            "worst_case_half", "rss_center", "rss_min", "rss_max", "rss_half"];
          const missing = fields.filter((f) => !totals.includes(String(study.result[f])));
          push(`[real] ${study.id}'s totals are the projection's numbers`,
            missing.length === 0);
          if (missing.length) console.log(`    missing: ${missing.join(", ")}`);
          push(`[real] ${study.id} numbers every contribution`,
            await page.locator("tr.tvrow").count() === study.result.chain.length);
        }
      }

      // --- the nav rail: one mark per row (viewer_nav_verdict_into_alert_and_icon)
      //
      // Jeff, 2026-09-22, on this rail as the 09-21 fold left it: "get rid of
      // the pass/fail in the left side menu (move it into the alert along with
      // all the other alerts). Also reformat the alert icon: get rid of the
      // rounded border around it, make the actual icon larger so it's legible
      // (or replace it with a proper icon/emoji rather than a character)."
      //
      // Two of those three are claims only a real browser can settle, which is
      // why they are checked here and not only in the shim:
      //
      //   * "LEGIBLE" is a RENDERED SIZE. The shim can read the `width`
      //     attribute the icon was built with; only a layout engine can say
      //     what the mark actually measures on the row, and a stylesheet that
      //     collapsed it (`line-height: 0` on an inline-flex box is a real way
      //     to get zero height) would sail through a class-name check.
      //   * "NO ROUNDED BORDER" is computed style. A leftover `.chip` rule
      //     matching the badge would put the border back with the markup
      //     unchanged.
      //
      // And the third thing a browser adds, unchanged from 09-21: the rail is
      // 300px, sticky, `overflow-y: auto`, so a popup rendered INSIDE a row
      // would be clipped to it and a row near the bottom would open its card
      // off the bottom of the scrollport. The card is the page's shared
      // `position: fixed` node for exactly that reason.
      const navAlerts = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(
          "#navtree .navtree__row--study"));
        // A loose stack is an option of the model picker since 2026-11-10, with
        // no row and so no mark: counted as the leaves, marked never.
        const leaves = Array.from(document.querySelectorAll(
          '#navtree option[data-nav-kind="stack"]'));
        const icons = Array.from(document.querySelectorAll("#navtree .navstatus"));
        const measure = (icon) => {
          const svg = icon.querySelector("svg");
          const box = svg && svg.getBoundingClientRect();
          const style = getComputedStyle(icon);
          return {
            w: box ? Math.round(box.width) : 0,
            h: box ? Math.round(box.height) : 0,
            colour: style.color,
            border: style.borderTopWidth + " " + style.borderTopStyle,
            radius: style.borderTopLeftRadius,
            // The one place the mark may grow a box is a focus ring, and
            // nothing is focused here.
            outline: style.outlineStyle,
            paths: icon.querySelectorAll("path").length,
          };
        };
        const marks = (r) => r.querySelectorAll(".navstatus").length;
        return {
          rows: rows.length,
          leaves: leaves.length,
          worst: Math.max(...rows.map(marks), ...leaves.map(marks)),
          silent: rows.filter((r) => !marks(r)).length,
          marked: rows.filter(marks).length,
          leavesMarked: leaves.filter(marks).length,
          // The retired presentations, all three of them, over the WHOLE rail.
          verdictChips: document.querySelectorAll("#navtree .tvverdict").length,
          flags: document.querySelectorAll("#navtree .tvflag").length,
          chips: document.querySelectorAll("#navtree span.chip").length,
          glyphs: (document.querySelector("#navtree").textContent
            .match(/⚠/g) || []).length,
          icons: icons.length,
          red: document.querySelectorAll("#navtree .navstatus--fail").length,
          amber: document.querySelectorAll("#navtree .navstatus--warn").length,
          shapes: icons.map(measure),
        };
      });
      push(`[real] every row on the rail wears at most ONE mark and no chip ` +
        `of any kind (${navAlerts.marked}/${navAlerts.rows} studies, ` +
        `${navAlerts.leavesMarked}/${navAlerts.leaves} leaves)`,
        navAlerts.rows >= 20 && navAlerts.leaves === 2 &&
        navAlerts.worst === 1 && navAlerts.verdictChips === 0 &&
        navAlerts.flags === 0 && navAlerts.chips === 0 &&
        navAlerts.icons >= 1);
      // The rail states its verdicts in the card now, so the glyph, the pill
      // and the flag are all gone together. No triangle CHARACTER either: the
      // mark is drawn, which is what makes its size independent of the type
      // scale.
      push("[real] not one triangle character is left anywhere on the rail",
        navAlerts.glyphs === 0);
      // Live tally, pinned: every live study row has something to say (11
      // amber and 10 red across the studies, measured 2026-09-22; the two
      // leaves are options of the picker since 2026-11-10 and wear no mark --
      // ISSUE_20261110_a_loose_stacks_status_mark_left_the_nav_with_its_row).
      // The quiet row is real and decided -- the fast tier's synthetic rows
      // cover it -- but no live artifact is in that position yet.
      push(`[real] no live row is silent, so the rail's silence is a promise ` +
        `rather than a gap (${navAlerts.amber} amber, ${navAlerts.red} red)`,
        navAlerts.silent === 0 && navAlerts.leavesMarked === 0 &&
        navAlerts.red >= 1 && navAlerts.amber >= 1);
      // The legibility claim, MEASURED, and the border claim off computed
      // style. Both on every icon on the rail, because one row styled
      // differently is the bug this is looking for.
      const SIZE = 14;
      const unreadable = navAlerts.shapes.filter((s) =>
        s.w < SIZE || s.h < SIZE || s.paths !== 1);
      const boxed = navAlerts.shapes.filter((s) =>
        !/^0px/.test(s.border) || !/^0px/.test(s.radius) || s.outline !== "none");
      // The measurement is read through a default, because the case this check
      // exists to catch -- no mark on the rail at all -- is exactly the case
      // that leaves `shapes` EMPTY, and a label reading `shapes[0].w` is
      // evaluated before push() ever sees the condition: the block aborted on
      // a TypeError there instead of failing, taking the border, colour and
      // placement checks below it with it (review, 2026-09-22).
      const shape = navAlerts.shapes[0] || { w: 0, h: 0 };
      push(`[real] the mark renders at a legible size on every row ` +
        `(${shape.w}x${shape.h}px, one path)`,
        navAlerts.shapes.length >= 1 && unreadable.length === 0);
      push("[real] and with no border, no corner radius and no outline — the " +
        "chip framing is gone, not just unclassed",
        boxed.length === 0);
      // Semantic colour, actually applied: `currentColor` off the level class
      // is the whole mechanism, so two levels that computed to the same colour
      // would leave the rail's red unscannable with every class name correct.
      const levels = [...new Set(navAlerts.shapes.map((s) => s.colour))];
      push(`[real] the two levels really do compute to different colours ` +
        `(${levels.length})`, levels.length === 2);
      // WHERE the mark sits, on the rows that make it a question. A study
      // name that needs two lines in 300px is ordinary, and `.navtree__row`'s
      // `flex-wrap: wrap` -- there for the topology row's id, and before that
      // for the retired chips strip -- put the icon on a THIRD line of its
      // own, left-aligned under the text, on every one of them. Found by
      // looking at the rail, which is the only way it could have been: the
      // markup, the classes and the shim's geometry are all identical either
      // way. So it is asserted where a layout engine can see it.
      const wrapped = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(
          "#navtree .navtree__row--study, #navtree .navtree__row--stack"))
          .filter((r) => r.querySelector(".navstatus"));
        const out = { twoLine: 0, misplaced: [] };
        for (const row of rows) {
          const label = row.querySelector(".navtree__label");
          const icon = row.querySelector(".navstatus");
          const lb = label.getBoundingClientRect();
          const ib = icon.getBoundingClientRect();
          // How many LINE BOXES the name takes, off a Range over its own text
          // rather than height ÷ line-height: `getComputedStyle(...).lineHeight`
          // answers the string "normal" whenever nothing in the cascade set a
          // number, and `parseFloat("normal")` is NaN -- which would make every
          // row look like one line and turn the anti-vacuity check below into a
          // silent pass-or-flake. A Range's client rects are one per line box,
          // measured by the same engine that laid the text out.
          const range = document.createRange();
          range.selectNodeContents(label);
          if (range.getClientRects().length > 1) out.twoLine++;
          // The mark is to the RIGHT of the name and inside the row's own
          // vertical extent -- never under the name on a line of its own.
          const rb = row.getBoundingClientRect();
          if (ib.left < lb.right - 1 || ib.top < rb.top ||
              ib.bottom > rb.bottom + 1) {
            out.misplaced.push(label.textContent.slice(0, 40));
          }
        }
        return out;
      });
      // The two-line COUNT is printed beside the check, never inside its name.
      // A name built by interpolation cannot be declared in
      // scripts/mutation_witnesses/ at all: `expect_red` is compared to the
      // printed name for EQUALITY, and it is paired against this file's source
      // on every pytest run, where `${wrapped.twoLine}` is what is written. So
      // an interpolated name is a guard that can never be enrolled -- which is
      // what kept this one out of the table until 2026-09-22.
      push("[real] the mark stays at the end of its row, including on the " +
        "rows whose name needs two lines",
        wrapped.twoLine >= 1 && wrapped.misplaced.length === 0);
      if (wrapped.twoLine < 1 || wrapped.misplaced.length) {
        console.log(`    two-line rows: ${wrapped.twoLine}` +
          (wrapped.misplaced.length
            ? `; under the name: ${wrapped.misplaced.join(" | ")}` : ""));
      }
      // Nothing open first: an open card plus a pointer aimed at it is the
      // hover-intent corridor's own case (`defer`), and it would hold this
      // hover for VA.HOVER_INTENT_MS rather than answer it.
      await dismissCard(page);
      // No marked study row, or a card that never opens, is what the two
      // pushes below exist to name: both read as a card with no items, never
      // as a hover timeout that takes the rest of the suite down.
      const navBadge = page.locator("#navtree .navtree__row--study .navstatus").first();
      if (await navBadge.count()) {
        await navBadge.hover();
        await page.waitForSelector(".hovercard--alerts", { timeout: 5000 }).catch(() => {});
      }
      const navCard = await page.evaluate(() => {
        const card = document.querySelector(".hovercard--alerts");
        if (!card) return { text: "", items: 0, onScreen: false, wider: false };
        const box = card.getBoundingClientRect();
        return {
          text: card.textContent,
          items: card.querySelectorAll("li.hovercard__alert").length,
          onScreen: box.top >= 0 && box.left >= 0 &&
            box.bottom <= window.innerHeight && box.right <= window.innerWidth,
          wider: box.width > 300,
        };
      });
      push(`[real] hovering it opens the card with every folded alert as a ` +
        `sentence (${navCard.items})`,
        navCard.items >= 1 && /[a-z]{4,}[^.]*\./.test(navCard.text));
      push("[real] the card escapes the 300px rail rather than being clipped " +
        "inside it, and lands wholly on screen",
        navCard.onScreen && navCard.wider);
      // ONE hover surface on the mark (nav_tooltip_once_and_rail_hover_
      // emphasis, 2026-09-30). Jeff: "there is a duplicate hover-over tooltip
      // (unformatted and formatted versions) that sometimes block each
      // other. Keep just the formatted one." A native `title` anywhere from
      // the element under the pointer up to the row is a second box the
      // browser will drop over the card, so the whole ancestor chain is
      // asked rather than just the badge -- the defect was on the ROW, two
      // levels above the pixel the pointer was on.
      const navSurfaces = await page.evaluate(() => {
        const badge = document.querySelector(
          "#navtree .navtree__row--study .navstatus");
        const row = badge && badge.closest(".navtree__row");
        // No marked study row is the regression the hover above already
        // reports by name; answering it here as a failing shape, not a
        // TypeError, keeps the three pushes below on the board.
        if (!row) {
          return { titled: ["(no study row with a mark to read)"], named: null,
                   labelTitle: null, described: 0 };
        }
        const chain = [];
        for (let n = badge; n && n !== row.parentNode; n = n.parentNode) {
          if (n.getAttribute && n.getAttribute("title") !== null) {
            chain.push((n.className || "") + "=" + n.getAttribute("title"));
          }
        }
        const label = row.querySelector(".navtree__label");
        return {
          titled: chain,
          named: badge.getAttribute("aria-label") || null,
          labelTitle: label ? label.getAttribute("title") : null,
          described: Array.from(
            document.querySelectorAll("#navtree .navtree__label"))
            .filter((n) => n.getAttribute("title")).length,
        };
      });
      push("[real] a nav mark under the pointer offers the card and nothing " +
        "else: no native tooltip on it or on any ancestor up to its row",
        navSurfaces.titled.length === 0);
      if (navSurfaces.titled.length) {
        console.log("    still titled: " + navSurfaces.titled.join(" | "));
      }
      push("[real] ...and the description it used to collide with is still " +
        "one hover away, on the row's NAME",
        navSurfaces.described >= 1);
      push("[real] the mark keeps an accessible name even with no title " +
        "(BRIEF_20260914_hover_card_occlusion_and_a11y's own question is " +
        "not answered here, but the name is not lost to this change)",
        !!navSurfaces.named);
      await dismissCard(page);

      // --- one hover state, two surfaces (nav_tooltip_once_and_rail_hover_
      //     emphasis, 2026-09-30; on the map since 2026-11-17) ---------------
      //
      // Jeff: "it would be awesome if the DAG and the table/grid shared their
      // highlighted state, so everything lit up together." The product model
      // is the case: a grid long enough that a reader cannot see a row and its
      // edge at once. What a DOM shim cannot answer: whether the light is
      // actually PAINTED on the row, and whether a real pointer event on the
      // map's mark lights the row back.
      await pickModel(page, "vpa_pitch_linkage");
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });
      await dismissCard(page);
      const litNow = () => page.evaluate(() => ({
        map: Array.from(document.querySelectorAll(
          "svg.tv__map [class*='--lead'], svg.tv__map [class*='--hot']")).length,
        rows: Array.from(document.querySelectorAll("tr.tvrow--hot"))
          .map((n) => n.getAttribute("data-id")),
        leadRows: Array.from(document.querySelectorAll("tr.tvrow--lead"))
          .map((n) => n.getAttribute("data-id")),
      }));
      const nothingLit = (lit) => lit.map === 0 && lit.rows.length === 0 &&
        lit.leadRows.length === 0;
      push("[real] nothing on either surface is lit before a pointer arrives",
        nothingLit(await litNow()));

      // The two surfaces, both directions, on every edge row: a grid row
      // lights its edge's mark on the map (a dimension's jumper, a gap's
      // connector, keyed by the edge id) as own; the mark lights the row back.
      const sharedHover = await page.evaluate(async () => {
        const fire = (node, type) => node.dispatchEvent(
          new MouseEvent(type, { bubbles: false }));
        const rows = Array.from(document.querySelectorAll("tr.tvrow--edge"));
        // A dimension's jumper or a gap's connector: a part may share its
        // id with one of its own dimensions (a bearing's), so by kind.
        const markFor = (id) => document.querySelector(
          "svg.tv__map g.map__jumper[data-map-id='" + CSS.escape(id) + "'], " +
          "svg.tv__map g.map__connector[data-map-id='" + CSS.escape(id) + "']");
        const state = (row, id) => {
          const mark = markFor(id);
          return {
            markLead: !!mark && /--lead/.test(mark.getAttribute("class") || ""),
            leadMap: document.querySelectorAll("svg.tv__map [class*='--lead']").length,
            hotRows: Array.from(document.querySelectorAll("tr.tvrow--hot"))
              .map((n) => n.getAttribute("data-id")),
            leadRows: Array.from(document.querySelectorAll("tr.tvrow--lead"))
              .map((n) => n.getAttribute("data-id")),
            rowTint: row
              ? getComputedStyle(row.querySelector("td.tvcell")).backgroundColor
              : null,
          };
        };
        const each = rows.map((row) => {
          const id = row.getAttribute("data-id");
          const rest = state(row, id);
          fire(row, "mouseenter");
          const fromRow = state(row, id);
          fire(row, "mouseleave");
          // A row with no mark on the map is the asymmetry this block exists
          // to catch: `fromMark: null` disagrees with `fromRow`.
          const mark = markFor(id);
          if (mark) fire(mark, "mouseenter");
          const fromMark = mark ? state(row, id) : null;
          if (mark) fire(mark, "mouseleave");
          return { id, rest, fromRow, fromMark, cleared: state(row, id) };
        });
        return { each, after: rows.length ? state(rows[0], rows[0].getAttribute("data-id")) : null,
                 selected: document.querySelectorAll("tr.tvrow--selected").length };
      });
      const rowsLit = sharedHover.each;
      const wrong = rowsLit.filter((r) =>
        !r.fromRow.markLead || r.fromRow.leadRows.join() !== r.id ||
        r.fromRow.rowTint === r.rest.rowTint);
      push("[real] hovering ANY grid row lights that edge on the map and really paints the row",
        rowsLit.length >= 20 && wrong.length === 0);
      if (wrong.length) {
        console.log("    rows that did not light their edge: " +
          wrong.slice(0, 5).map((r) => r.id + "=" + JSON.stringify(r.fromRow)).join(" | "));
      }
      const disagreed = rowsLit.filter((r) =>
        JSON.stringify(r.fromMark) !== JSON.stringify(r.fromRow));
      push("[real] and hovering the edge on the map lights the row back in the same " +
        "state -- one hover model, not two that agree today",
        disagreed.length === 0);
      if (disagreed.length) {
        console.log("    surfaces disagreed on: " +
          disagreed.slice(0, 5).map((r) => r.id + " row=" + JSON.stringify(r.fromRow) +
            " map=" + JSON.stringify(r.fromMark)).join(" | "));
      }
      push("[real] leaving clears both surfaces, every time: nothing is left " +
        "lit behind the pointer",
        rowsLit.every((r) => r.cleared.leadRows.length === 0 &&
          r.cleared.rowTint === r.rest.rowTint) &&
        !!sharedHover.after && sharedHover.after.leadRows.length === 0);
      push("[real] hovering selected nothing: a pointer tints, a click picks",
        sharedHover.selected === 0);

      // The product model's grid: no row painted, every bracket drawn, its
      // untraced rows saying so on their mark.
      const realBands = await page.evaluate(GRID_ROWS_IN_PAGE);
      push("[real] the product model's rows wear no paint, its brackets are drawn, " +
        "and its untraced rows say so on their mark",
        realBands.bad.length === 0 && realBands.rows === realBands.rowHeights.length &&
        // A floor, not a share: 21 of the product graph's 59 rows are
        // untraced since the 2026-10-26 fold (20 of pitch_system's 24 were).
        realBands.provenanceLayers >= 20);
      if (realBands.bad.length) console.log("    bands: " + realBands.bad.slice(0, 5).join(" | "));

      // A switch needs a second real topology to switch to.
      const otherReal = realProjection.topologies.find((t) => t.id !== "vpa_pitch_linkage");

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
      await page.locator("#edge-value-toggle").click();
      await page.waitForTimeout(80);
      const offDefaults = async () => ({
        density: await page.locator("#density-toggle").textContent(),
        valueOnly: await page.locator("#edge-value-toggle").textContent(),
      });
      const beforeSwitch = await offDefaults();
      push("[real] the anchor: density and value-only rows are both off their " +
        "defaults before the switch",
        /Rows: Compact/.test(beforeSwitch.density) &&
        /Rows: values only/.test(beforeSwitch.valueOnly));
      if (otherReal) {
      await pickModel(page, otherReal.id);
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });
      const afterSwitch = await offDefaults();
      push("[real] switching topology keeps the density and the value-only rows as well",
        afterSwitch.density === beforeSwitch.density &&
        afterSwitch.valueOnly === beforeSwitch.valueOnly);
      } else {
        push("[real] SKIPPED -- no second live topology to switch to " +
          "(ISSUE_20261027_no_real_topology_switch_since_the_fold.md)", true);
      }
      // Back to the defaults, and back to pitch_system, for the checks below.
      await page.locator("#density-toggle").click();
      await page.locator("#edge-value-toggle").click();
      await page.waitForTimeout(80);
      await pickModel(page, "vpa_pitch_linkage");
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });

      // The preview pane over a real citation, with a real crop behind it.
      await clearPoint(page, "tr.tvrow[data-id='fastener_grip_vpa_out'] .tvcell--name", "click");
      const detail = await page.locator("#detail").textContent();
      push("[real] an L1 edge shows the stack element's own citation",
        /NAS6403-NAS6420 Rev 4\.pdf/.test(detail) && /NAS6404U13D/.test(detail));

      // --- the grips under a narrowed grid column ------------------------
      //
      // The reader can drag the column of settings, grid and Preview narrower
      // than the grid (the side divider, the fixed shell 2026-11-14), and a
      // grip parked at a content coordinate past the column's visible right
      // edge would be a control with no way in (ISSUE_20260915_a_wide_preview_
      // pane_can_cover_the_grids_own_drag_grips). A pointer-down is the whole
      // claim, so this drags the grip for real and reads the width back -- a
      // `boundingBox()` would report a clipped grip's box just as happily.
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
      const NAME_GRIP = '.tvgrip--col[data-resize="column:name"]';
      const nameWidth = () => page.evaluate(() => window.ViewerApp.topoColumn("name").width);
      // Dragged out and straight back, so the check leaves the page as it
      // found it.
      const gripAnswers = async () => {
        const before = await nameWidth();
        await dragBy(NAME_GRIP, 40);
        const widened = await nameWidth();
        await dragBy(NAME_GRIP, -40);
        return widened > before;
      };
      const columnWidth = () => page.evaluate(() =>
        Math.round(document.querySelector(".tv__main").getBoundingClientRect().width));
      // The side divider is where the reader's own hand is: dragging it LEFT
      // widens the column and narrows the DAG.
      const setColumn = async (target) => {
        const box = await page.locator("#side-divider").boundingBox();
        const now = await columnWidth();
        await page.mouse.move(box.x + box.width / 2, box.y + 120);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 - (target - now), box.y + 120,
          { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(140);
        return columnWidth();
      };
      await pickModel(page, "vpa_pitch_linkage");
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });
      const columnAtStart = await columnWidth();
      // The ELEMENT column dragged wide first: its boundary then ends up well
      // right of anything on screen in a narrowed column.
      await dragBy(NAME_GRIP, 220);
      for (const target of [520, 760]) {
        const got = await setColumn(target);
        push(`[real] with the grid's column dragged to ${got}px, the ELEMENT column's grip ` +
          `still answers a pointer-down (topology_grid_scroll_and_grips)`,
          await gripAnswers());
      }
      await dragBy(NAME_GRIP, -220);
      await setColumn(columnAtStart);
      push("[real] and the page is back on the column width it started at, so " +
        "the divider block below measures what it thinks it does",
        Math.abs((await columnWidth()) - columnAtStart) < 2);
      await page.evaluate((k) => window.localStorage.removeItem(k),
        await page.evaluate(() => window.ViewerApp.PANE_WIDTH_KEY));
    }

    // --- the seams (viewer_component_names_and_reference_copy, 2026-09-15;
    //     the fixed shell, 2026-11-14) ----------------------------------------
    //
    // Jeff: "the right preview pane is resizable. It's too narrow." Since the
    // fixed shell the Preview is under the grid, so two seams answer him: the
    // side divider (the column's width) and the row divider (the Preview's
    // height). Three claims a DOM shim cannot make, for each: a real pointer
    // drag moves the seam the right way, the neighbour gives up the room
    // rather than the page overflowing, and a RELOAD gets the size back.
    const sizes = () => page.evaluate(() => ({
      column: document.querySelector(".tv__main").getBoundingClientRect().width,
      dag: document.querySelector("#topopane").getBoundingClientRect().width,
      preview: document.getElementById("detail").getBoundingClientRect().height,
      grid: document.getElementById("topogrid").getBoundingClientRect().height,
      gridBottom: document.getElementById("topogrid").getBoundingClientRect().bottom,
      previewTop: document.getElementById("detail").getBoundingClientRect().top,
      storedColumn: window.localStorage.getItem(window.ViewerApp.PANE_WIDTH_KEY),
      storedPreview: window.localStorage.getItem(window.ViewerApp.PREVIEW_HEIGHT_KEY),
      overflow: document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth +
        document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight,
    }));
    const drag = async (sel, dx, dy) => {
      const b = await page.locator(sel).boundingBox();
      const x = b.x + b.width / 2, y = b.y + b.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + dx, y + dy, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(140);
    };
    const side = page.locator("#side-divider");
    const row = page.locator("#detail-divider");
    push("the column right of the DAG carries a full-height drag divider, and the " +
      "Preview a full-width one along the grid's foot",
      await side.count() === 1 && (await side.boundingBox()).height > 300 &&
      await row.count() === 1 && (await row.boundingBox()).width > 300);
    const beforeSeams = await sizes();
    // Drag LEFT to widen -- the column is on the right of its divider, and
    // getting that sign backwards is the likeliest mistake in the feature.
    await drag("#side-divider", -160, 0);
    const wider = await sizes();
    push("dragging the side divider LEFT widens the column, the DAG gives up the " +
      "width, nothing overflows, and the width is written down",
      wider.column > beforeSeams.column + 120 && wider.dag < beforeSeams.dag - 120 &&
      wider.overflow <= 0 && Number(wider.storedColumn) === Math.round(wider.column));
    // UP to grow -- the Preview is below its divider.
    await drag("#detail-divider", 0, -120);
    const taller = await sizes();
    push("dragging the row divider UP makes the Preview taller, the grid gives up the " +
      "height, nothing overflows, and the height is written down",
      // The grid gives up what it has above its floor (160 px), and no more:
      // on this short window that is less than the drag asked for, and the
      // height written down is the one drawn, not the one asked for.
      taller.preview > wider.preview + 40 && taller.grid <= wider.grid + 0.5 &&
      taller.grid >= 159 &&
      taller.gridBottom <= taller.previewTop + 1 &&
      taller.overflow <= 0 && Number(taller.storedPreview) === Math.round(taller.preview));

    // The keyboard path, which needs no pointer at all: both dividers are
    // focusable and their own arrow keys nudge them.
    await side.focus();
    await page.keyboard.press("ArrowRight");
    await row.focus();
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(80);
    const nudged = await sizes();
    push("the arrow keys nudge both dividers without a pointer",
      nudged.column < taller.column - 4 && nudged.preview < taller.preview - 4 &&
      Number(nudged.storedColumn) === Math.round(nudged.column) &&
      Number(nudged.storedPreview) === Math.round(nudged.preview));
    push("and the divider keeps its focus across the re-render the nudge caused",
      await page.evaluate(() => document.activeElement &&
        document.activeElement.id === "detail-divider"));

    // THE claim. A reload constructs the page from scratch; nothing but
    // localStorage carries the sizes across it.
    await page.reload();
    await page.waitForSelector(".tvtable", { timeout: 15000 });
    const reloaded = await sizes();
    push("a reload gets the remembered column width and Preview height back",
      Math.abs(reloaded.column - nudged.column) < 2 &&
      Math.abs(reloaded.preview - nudged.preview) < 2);
    // ...and the diagram's own preferences are back to their defaults, which
    // is the asymmetry the README argues for.
    push("the diagram's own preferences did NOT persist with it",
      /comfortable/i.test(await page.locator("#density-toggle").textContent()));
    await page.evaluate(() => {
      window.localStorage.removeItem(window.ViewerApp.PANE_WIDTH_KEY);
      window.localStorage.removeItem(window.ViewerApp.PREVIEW_HEIGHT_KEY);
    });

    // --- the nav's own divider (a_face_is_picked_the_way_cad_picks_it) ------
    // Jeff: "the left side menu needs to be draggable to resize." The nav is
    // LEFT of its divider, so a drag RIGHT widens it; the width is clamped to
    // the floor and to half the window, and a reload gets it back.
    const navWidth = () => page.evaluate(() => ({
      nav: Math.round(document.getElementById("navtree").getBoundingClientRect().width),
      stored: window.localStorage.getItem(window.ViewerApp.NAV_WIDTH_KEY),
      floor: window.ViewerApp.NAV_WIDTH.min,
      half: Math.floor(window.innerWidth / 2),
    }));
    const navDivider = page.locator("#nav-divider");
    const navBox = (await navDivider.count()) === 1 ? await navDivider.boundingBox() : null;
    push("the nav carries a full-height drag divider", !!navBox && navBox.height > 300);
    // With no divider the drags below have nothing to press: they do nothing,
    // and the checks after them say so rather than aborting the suite.
    const dragNav = async (dx) => {
      const box = navBox ? await navDivider.boundingBox() : null;
      if (!box) return;
      await page.mouse.move(box.x + box.width / 2, box.y + 120);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + dx, box.y + 120, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(120);
    };
    const navBefore = await navWidth();
    await dragNav(140);
    const navAfter = await navWidth();
    push("dragging the nav's divider RIGHT widens the nav, and the width is written down",
      navAfter.nav > navBefore.nav + 120 && Number(navAfter.stored) === navAfter.nav);
    await page.reload();
    await page.waitForSelector(".tvtable", { timeout: 15000 });
    const navReloaded = await navWidth();
    push("a reload gets the remembered nav width back",
      Math.abs(navReloaded.nav - navAfter.nav) < 2);
    await dragNav(-2000);
    const navFloor = await navWidth();
    await dragNav(4000);
    const navCap = await navWidth();
    push("the nav clamps at its floor and at half the window",
      Math.abs(navFloor.nav - navFloor.floor) < 2 && Math.abs(navCap.nav - navCap.half) < 2);
    await page.evaluate(() => window.localStorage.removeItem(window.ViewerApp.NAV_WIDTH_KEY));

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
  }
}

// --- the region contract: nothing scrolls the document -----------------------
//
// The fixed shell (the_page_is_a_fixed_layout_and_nothing_scrolls_the_document,
// 2026-11-14) REPLACES the full-page-scroll contract this suite pinned from
// viewer_error_surface_and_layout (2026-09-09) on: the page is exactly the
// window, and the tree, the DAG, the grid and the Preview each scroll by
// themselves inside it. What this measures, at a short window where the mock
// fixture's rows already need more room than the regions give:
//
//   * the document's own scroller reports no overflow, either way;
//   * each region is a scroll container inside the window;
//   * scrolling one region moves no other region and not the document;
//   * the grid's rows start directly under their header, in every length mode
//     -- the store's centring offsets the DRAWING, never the table beside it;
//   * the length modes still draw the DAG at the height they need.
//
// The legend and the worksheet are <dialog>s and never participate in the
// row, so this test does not open them.
const REGIONS_IN_PAGE = () => {
  const d = document.scrollingElement;
  const region = (sel) => {
    const n = document.querySelector(sel);
    if (!n) return null;
    const r = n.getBoundingClientRect();
    const st = getComputedStyle(n);
    return { overflowY: st.overflowY, top: r.top, bottom: r.bottom, left: r.left,
             right: r.right, scrollTop: n.scrollTop,
             scrolls: n.scrollHeight > n.clientHeight + 1 };
  };
  return {
    doc: { overflowX: d.scrollWidth - d.clientWidth, overflowY: d.scrollHeight - d.clientHeight,
           scrollTop: d.scrollTop },
    window: { width: window.innerWidth, height: window.innerHeight },
    dag: region("#topopane .tv__hscroll"), grid: region("#topogrid .tv__gridscroll"),
    tree: region("#navtree"),
    // The Preview's box; a split pane (results over the Preview) scrolls each
    // half itself, so its own overflow is read off the half that scrolls.
    preview: Object.assign(region("#detail") || {},
      document.querySelector("#detail.detail--split")
        ? { overflowY: getComputedStyle(document.querySelector(
          "#detail .detail__previewbody")).overflowY } : {}),
  };
};

async function testHeightBudget(browser, url, label, realProjection, realCrops) {
  // Short enough that the mock fixture's grid needs more room than its region
  // gives.
  const page = await browser.newPage({ viewport: { width: 1400, height: 600 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });

  const regions = () => page.evaluate(REGIONS_IN_PAGE);
  const inWindow = (r, w) => !!r && r.top >= -0.5 && r.bottom <= w.height + 0.5 &&
    r.left >= -0.5 && r.right <= w.width + 0.5;
  const scrolls = (r) => !!r && (r.overflowY === "auto" || r.overflowY === "scroll");
  // Scroll one region; read where every region and the document are after it.
  const scrollOne = (sel, y) => page.evaluate(({ sel, y }) => {
    document.querySelector(sel).scrollTop = y;
    return new Promise((ok) => requestAnimationFrame(() => ok(null)));
  }, { sel, y });
  // The map's own view: it pans and zooms inside its region (views/map.js)
  // and is never scrolled, so where it is is its world's transform.
  const mapView = () => page.evaluate(() => {
    const world = document.querySelector("#topopane svg.tv__map g.map__world");
    return world ? world.getAttribute("transform") : null;
  });
  // Every grid row's edge is on the map, as its jumper or its connector.
  const onTheMap = () => page.evaluate(() => Array.from(
    document.querySelectorAll("#topogrid tr.tvrow[data-row-kind='edge']"))
    .map((row) => row.getAttribute("data-id"))
    .filter((id) => !document.querySelector(
      `#topopane svg.tv__map g.map__jumper[data-map-id="${CSS.escape(id)}"], ` +
      `#topopane svg.tv__map g.map__connector[data-map-id="${CSS.escape(id)}"]`)));

  // The contract at the window the page is at: no document overflow, every
  // region inside the window; the tree, the grid and the Preview scroll by
  // themselves, and the map's region holds the map.
  const contract = async (tag) => {
    const r = await regions();
    push(`[${tag}] nothing scrolls the document: it is exactly the window, both ways`,
      r.doc.overflowX <= 0 && r.doc.overflowY <= 0);
    push(`[${tag}] the tree, the grid and the Preview each scroll by themselves, and ` +
      "the map's region holds the map, all inside the window",
      ["tree", "dag", "grid", "preview"].every((k) => inWindow(r[k], r.window)) &&
      ["tree", "grid", "preview"].every((k) => scrolls(r[k])) &&
      await page.locator("#topopane svg.tv__map").count() === 1);
    return r;
  };

  try {
    await page.goto(url + "/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });
    await pickModel(page, "demo_mechanism");
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 5000 });

    const mock = await contract("mock");
    push("[mock] at this window the grid has more rows than room, so the checks " +
      "below scroll something real",
      mock.grid && mock.grid.scrolls);

    // The grid scrolls alone: the map's view and the document stay put.
    const viewBefore = await mapView();
    await scrollOne("#topogrid .tv__gridscroll", 90);
    const afterGrid = await regions();
    push("[mock] scrolling the grid moves the grid alone -- never the map's view, " +
      "the tree or the document",
      afterGrid.grid.scrollTop > 0 && afterGrid.tree.scrollTop === 0 &&
      afterGrid.doc.scrollTop === 0 && viewBefore !== null &&
      (await mapView()) === viewBefore);
    // A repaint that moves no row (how an edge row prints itself, twice)
    // keeps each region where the reader left it.
    await page.locator("#edge-value-toggle").click();
    await page.locator("#edge-value-toggle").click();
    await page.waitForTimeout(80);
    const afterPaint = await regions();
    push("[mock] a repaint puts each region back where the reader left it",
      Math.abs(afterPaint.grid.scrollTop - afterGrid.grid.scrollTop) < 1 &&
      (await mapView()) === viewBefore);
    await scrollOne("#topogrid .tv__gridscroll", 0);

    // A window that changes size after a paint: the shell still fits it.
    await page.setViewportSize({ width: 1400, height: 320 });
    await page.waitForTimeout(400);
    const small = await regions();
    push("[mock] and the shorter window is still the whole page: nothing scrolls the document",
      small.doc.overflowY <= 0 && small.doc.overflowX <= 0);
    await page.setViewportSize({ width: 1400, height: 600 });
    await page.waitForTimeout(400);

    // Compact density. The row pitch is the positive anchor, read against
    // VA.ROW_DENSITIES' own two numbers (ISSUE_20260914_compact_density_
    // correspondence_check_has_no_positive_anchor), and it is also the effect
    // to wait FOR.
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
    push("every grid row's edge is still on the map at compact density",
      (await onTheMap()).length === 0);
    await page.locator("#density-toggle").click();

    if (!realProjection) {
      push("[real] the product model's region check (skipped: not built)", true);
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
      await pickModel(page, "vpa_pitch_linkage");
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });
      const real = await contract("real");
      push("[real] the product model's rows scroll inside the grid's region, the " +
        "map is drawn in its own, and the document stays the window",
        real.grid && real.grid.scrolls && real.doc.overflowY <= 0 &&
        await page.locator("#topopane svg.tv__map").count() === 1);
    }

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
  }
}

// --- the map (the_map_draws_the_end_stop_model, 2026-11-16) -----------------
//
// The DAG region's one drawing of the model (apps/viewer/map.js,
// views/map.js; the only one since the_map_is_the_only_drawing_and_classic_
// retires, 2026-11-17), on the real end-stop model with the 3D pane open
// beside it: it draws the model's counts, the one selection and the one hover
// light it both ways against the tree, the grid and the scene, and it fits,
// zooms and pans in its region. v1, which has no layout file, draws its map
// from the computed places.
const MAP_TOPOLOGY = "vpa_end_stop_v2";
// A hub feature with a standing binding in the served log (face 144 of the
// hub's mesh, the pilot gap's from-end), so the scene has a face to pick.
const MAP_BOUND_FEATURE = "hub@hub_spindle_bore_axis";
const MAP_BOUND_EDGE = "hub_boss_in_tan_link_mount_pilot";

async function testTheMap(browser, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const model = topologies && (topologies.topologies || []).find((t) => t.id === MAP_TOPOLOGY);
  const legacy = topologies && (topologies.topologies || []).find((t) => t.id === "vpa_pitch_linkage");
  const servedLog = await readProjection("feature-identity/log.json");
  const bound = servedLog && (servedLog.events || []).find((e) => e && e.verdict === "bound" &&
    e.stack_key && e.stack_key.edge_id === MAP_BOUND_EDGE && e.stack_key.topology_id === MAP_TOPOLOGY &&
    e.geometry_key && e.geometry_key.source_step_sha256);
  const index = await realDataIndexForTheAnnotator();
  if (!model || !model.map || !model.model || !legacy || !bound || !index.meshes.length) {
    push("[real] the map on the end-stop model (skipped: the topology projection with the map's " +
      "layout, the served identity log with the hub's binding or the meshes are not on disk -- " +
      "build them, or pass --repo <a root built from this tree>)", true);
    return reportSuite(label, checks, errors);
  }
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1700, height: 1500 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await installRealAnnotatorReads(page, { meshes: index.meshes, runs: index.runs,
    aliases: index.aliases, binding: "real" });
  const inPane = (fn, arg) => page.evaluate(({ src, arg }) => {
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    if (!w || !w.document) return null;
    return new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
  }, { src: fn.toString(), arg });
  const until = async (fn, arg, timeout = 30000) => {
    try {
      await page.waitForFunction(({ src, arg }) => !!new Function("arg",
        "return (" + src + ")(arg);")(arg), { src: fn.toString(), arg }, { timeout, polling: 100 });
      return true;
    } catch {
      return false;
    }
  };
  const untilPane = async (fn, arg, timeout = 30000) => {
    try {
      await page.waitForFunction(({ src, arg }) => {
        const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
        if (!w || !w.document) return false;
        return !!new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
      }, { src: fn.toString(), arg }, { timeout, polling: 100 });
      return true;
    } catch {
      return false;
    }
  };
  const mapEl = (kind, id) => `#topopane svg.tv__map [data-map-kind="${kind}"][data-map-id="${id}"]`;
  const classOf = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? el.getAttribute("class") || "" : null;
  }, sel);
  const settle = (ms = 250) => page.waitForTimeout(ms);
  // What the four surfaces say about a feature, a part or a dimension.
  const surfaces = () => page.evaluate(() => {
    const cls = (sel) => Array.from(document.querySelectorAll(sel));
    const ids = (sel, attr) => cls(sel).map((n) => n.getAttribute(attr));
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    const L = w && w.__lastLight;
    return {
      treeHot: ids("#navtree .navtree__row--hot", "data-nav-id"),
      // A lit row behind a closed fold marks the fold instead (VA.lightNavTree).
      treeHolds: ids("#navtree .navtree__row--holds", "data-nav-id"),
      treeHotTouching: ids("#navtree .navtree__row--hot-touching", "data-nav-id"),
      treeOn: ids("#navtree .navtree__row--on", "data-nav-id"),
      gridLead: ids("#topogrid tr.tvrow--lead", "data-id"),
      gridHot: ids("#topogrid tr.tvrow--hot", "data-id"),
      gridSelected: ids("#topogrid tr.tvrow--selected", "data-id"),
      mapLead: cls("#topopane svg.tv__map [data-map-kind]").filter((n) => /--lead\b/.test(n.getAttribute("class") || ""))
        .map((n) => n.getAttribute("data-map-kind") + ":" + n.getAttribute("data-map-id")),
      mapHot: cls("#topopane svg.tv__map [data-map-kind]").filter((n) => /--hot\b/.test(n.getAttribute("class") || ""))
        .map((n) => n.getAttribute("data-map-kind") + ":" + n.getAttribute("data-map-id")),
      mapSelected: cls("#topopane svg.tv__map [data-map-kind]").filter((n) => /--selected\b/.test(n.getAttribute("class") || ""))
        .map((n) => n.getAttribute("data-map-kind") + ":" + n.getAttribute("data-map-id")),
      mapTouched: cls("#topopane svg.tv__map [data-map-kind]").filter((n) => /--touched\b/.test(n.getAttribute("class") || ""))
        .map((n) => n.getAttribute("data-map-kind") + ":" + n.getAttribute("data-map-id")),
      paneLayers: L ? L.layers.map((l) => ({ role: l.role, tier: l.tier, faces: l.faceOverlays || 0, parts: l.partOverlays || 0 })) : null,
    };
  });
  const hoverMap = async (kind, id) => {
    // The pin's own hit circle, at its centre; a box by its stroke is its
    // name's business, so a part is hovered by its name. Anchored: the map
    // re-fits while the 3D pane settles beside it, so the element's rect is
    // read until two reads agree and the mouse goes to that centre -- a
    // locator's own stability wait timed out here on the review's run.
    const sel = kind === "part" ? `#topopane svg.tv__map g.map__partname[data-map-id="${id}"] text`
      : kind === "dimension" ? `#topopane svg.tv__map g.map__jumper[data-map-id="${id}"] path.map__jumperhit`
      : kind === "interface" ? `#topopane svg.tv__map g.map__connector[data-map-id="${id}"] path.map__connectorhit`
      : `#topopane svg.tv__map g.map__pin[data-map-id="${id}"] circle.map__pinhit`;
    const rectOf = () => page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    }, sel);
    let at = await rectOf();
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(150);
      const again = await rectOf();
      if (at && again && Math.abs(again[0] - at[0]) < 0.5 && Math.abs(again[1] - at[1]) < 0.5) { at = again; break; }
      at = again;
    }
    if (!at) throw new Error("no map element for " + kind + " " + id);
    await page.mouse.move(at[0], at[1]);
    await settle();
  };
  const restHover = async () => {
    await page.locator("#navtree h2.navtree__heading").first().hover({ timeout: 2000 }).catch(() => {});
    await settle();
  };
  const paneBox = () => page.evaluate(() => {
    const r = document.getElementById("topopane").getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  });
  const worldBox = () => page.evaluate(() => {
    const g = document.querySelector("#topopane svg.tv__map g.map__world");
    const r = g && g.getBoundingClientRect();
    return r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null;
  });
  const zoomOf = () => page.evaluate(() => {
    const s = document.querySelector("#topopane svg.tv__map");
    return s ? Number(s.getAttribute("data-zoom")) : null;
  });
  const inside = (r, b, slack = 1) => !!r && r.left >= b.left - slack && r.top >= b.top - slack &&
    r.right <= b.right + slack && r.bottom <= b.bottom + slack;

  try {
    await page.goto(url + "/apps/viewer/topology.html?topology=" + MAP_TOPOLOGY, { waitUntil: "load" });
    await pickModel(page, MAP_TOPOLOGY);
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 30000 }).catch(() => {});
    await settle(400);

    // --- 1. the map, and no switch -----------------------------------------
    const opened = await page.evaluate(() => ({
      map: document.querySelectorAll("#topopane svg.tv__map").length,
      rails: document.querySelectorAll("#topopane svg.tv__rails").length,
      switches: document.querySelectorAll("#dag-drawing, .tv__daghead").length,
      grid: document.querySelectorAll("#topogrid tr.tvrow").length,
    }));
    console.log(`      [${label}] opened: ${JSON.stringify(opened)}`);
    push("[real] the model opens on the map: the region draws the map and no rails, there is no " +
      "drawing switch, and the grid beside it is drawn as ever",
      opened.map === 1 && opened.rails === 0 && opened.switches === 0 && opened.grid > 0);

    // --- 2. the counts -------------------------------------------------------
    const counts = await page.evaluate(() => {
      const svg = document.querySelector("#topopane svg.tv__map");
      const ids = (sel) => Array.from(svg.querySelectorAll(sel)).map((n) => n.getAttribute("data-map-id"));
      const once = (list) => new Set(list).size === list.length;
      const districts = ids("rect.map__district"), boxes = ids("rect.map__box"), pins = ids("g.map__pin"),
        jumpers = ids("g.map__jumper"), connectors = ids("g.map__connector");
      return { drawn: { bodies: districts.length, parts: boxes.length, features: pins.length,
        dimensions: jumpers.length, interfaces: connectors.length },
        once: [districts, boxes, pins, jumpers, connectors].every(once),
        symbols: Array.from(svg.querySelectorAll("g.map__symbol")).map((s) => s.getAttribute("data-symbol")),
        // The hub to blade joint: its symbol on the map, and its word in the
        // tree's "Joints between bodies" row (a_joint_says_what_kind_it_is).
        bearing: (() => {
          const g = svg.querySelector('g.map__connector[data-map-id="hub_blade1_root_bearing_bore"]');
          const sym = g ? g.querySelector("g.map__symbol") : null;
          const row = document.querySelector('.navtree__row--interface[data-nav-id="hub_blade1_root_bearing_bore"]');
          const word = row ? row.querySelector(".navtree__count") : null;
          return { symbol: sym ? sym.getAttribute("data-symbol") : null,
            title: sym && sym.querySelector("title") ? sym.querySelector("title").textContent : null,
            tree: word ? word.textContent : null };
        })(),
        notes: window.ViewerApp.lastMapLight.geometry.notes };
    });
    const c = model.model.counts;
    const expected = { bodies: c.bodies, parts: c.parts, features: c.features, dimensions: c.dimensions, interfaces: c.interfaces };
    console.log(`      [${label}] drawn ${JSON.stringify(counts.drawn)} for ${JSON.stringify(expected)}; symbols ` +
      `${counts.symbols.join(", ")}; notes ${counts.notes.length ? counts.notes.join("; ") : "none"}`);
    push("[real] the map draws the model's counts: a district per body, a box per part, a pin per " +
      "feature, a jumper per dimension and a connector per interface, each once, and the layout " +
      "reports no defect",
      JSON.stringify(counts.drawn) === JSON.stringify(expected) && counts.once && counts.notes.length === 0);
    push("[real] every connector that states a kind wears a symbol, the clocking its ring of dots, " +
      "the pilot its circle and dot, the ball joints their cup and ball",
      counts.symbols.length === model.model.interfaces.filter((i) => i.kind).length &&
      counts.symbols.indexOf("fastener_pattern") !== -1 && counts.symbols.indexOf("pin_in_bore") !== -1 &&
      counts.symbols.filter((s) => s === "spherical").length === 4);
    console.log(`      [${label}] the hub to blade joint: ${JSON.stringify(counts.bearing)}`);
    push("[real] the hub to blade joint is the model's rotary joint: the map draws its rotary symbol, " +
      "its hover says so, and the tree's joint row reads rotary",
      counts.bearing.symbol === "revolute" && /a rotary joint$/.test(counts.bearing.title || "") &&
      counts.bearing.tree === "rotary");

    // --- 3. the fit, and the fills -------------------------------------------
    const fitted = await page.evaluate(() => {
      const pane = document.getElementById("topopane").getBoundingClientRect();
      const world = document.querySelector("#topopane svg.tv__map g.map__world").getBoundingClientRect();
      const texts = Array.from(document.querySelectorAll("#topopane svg.tv__map text"))
        .map((t) => t.getBoundingClientRect()).filter((r) => r.width > 0);
      const curves = Array.from(document.querySelectorAll("#topopane svg.tv__map path, #topopane svg.tv__map line"));
      const filled = curves.filter((p) => getComputedStyle(p).fill !== "none" || p.getAttribute("fill") !== "none").length;
      return { inside: world.left >= pane.left && world.top >= pane.top && world.right <= pane.right && world.bottom <= pane.bottom,
        clipped: texts.filter((r) => r.left < pane.left || r.right > pane.right || r.top < pane.top || r.bottom > pane.bottom).length,
        curves: curves.length, filled, zoom: document.querySelector("#topopane svg.tv__map").getAttribute("data-zoom") };
    });
    console.log(`      [${label}] fitted at ${fitted.zoom}: inside ${fitted.inside}, ${fitted.clipped} clipped labels, ` +
      `${fitted.filled}/${fitted.curves} curves filled`);
    push("[real] the map fits its region: the whole drawing is inside the pane and no label is clipped by it",
      fitted.inside && fitted.clipped === 0);
    push("[real] every curve the map draws is unfilled, in its markup and as the page computes it",
      fitted.curves > 0 && fitted.filled === 0);

    // --- 4. the 3D pane beside it ---------------------------------------------
    await page.waitForSelector("#pane-handle:visible", { timeout: 30000 });
    await page.locator("#pane-handle").click();
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
    const sceneReady = await untilPane((w) => w.AnnotateApp && w.__scene && w.__scene.listOpenParts().length > 0, null, 120000);
    await settle(1500);
    // Opening the pane does not repaint the region by itself; the claim is
    // about what the page draws WITH the pane open, so the page is repainted
    // (the density toggle renders; twice, to leave the rows as they were).
    await page.evaluate(() => document.getElementById("density-toggle").click());
    await page.evaluate(() => document.getElementById("density-toggle").click());
    await settle(400);
    const stillMap = await page.evaluate(() => document.querySelectorAll("#topopane svg.tv__map").length === 1 &&
      document.querySelectorAll("#topopane svg.tv__rails").length === 0);
    push("[real] with the 3D pane open beside it the region still draws the map",
      sceneReady && stillMap);

    // --- 5. hover, map -> tree, grid, scene -----------------------------------
    // The pane runs the page's commands one at a time, in arrival order
    // (AA.ExecQueue), and opening the model -- `isolate parts`, which opens
    // the rest of the mesh store as faint context too -- is one entry that
    // outlasts "a part is open" by tens of seconds on a busy box: a hover's
    // light posted before it is answered is drawn after it, and a 5s wait
    // read `pane null` (2026-11-18, the_map_pin_hover_lights_its_bound_face_
    // in_the_scene). So the pane is settled when a command posted now, behind
    // everything the page has posted, is answered -- and the wait below
    // times the light alone.
    const settledAt = Date.now();
    const paneSettled = await page.evaluate((timeout) => new Promise((resolve) => {
      const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
      if (!w) { resolve(false); return; }
      const id = "map-pane-settled-" + Math.random().toString(36).slice(2);
      const timer = setTimeout(() => { window.removeEventListener("message", on); resolve(false); }, timeout);
      function on(e) {
        if (!e.data || e.data.type !== "annotate:result" || e.data.id !== id) return;
        clearTimeout(timer);
        window.removeEventListener("message", on);
        resolve(true);
      }
      window.addEventListener("message", on);
      w.postMessage({ type: "annotate:exec", id, command: ["scene-view"] }, window.location.origin);
    }), 180000);
    const settledMs = Date.now() - settledAt;
    await hoverMap("feature", MAP_BOUND_FEATURE);
    let s = await surfaces();
    // The scene's light arrives by message; wait for a hover layer.
    await untilPane((w) => w.__lastLight && w.__lastLight.layers.some((l) => l.role === "hover"), null, 5000);
    s = await surfaces();
    console.log(`      [${label}] pane settled ${paneSettled} after ${settledMs}ms; pin hovered: tree hot ${JSON.stringify(s.treeHot)} holds ${JSON.stringify(s.treeHolds)}, grid hot ${JSON.stringify(s.gridHot)}, ` +
      `map lead ${JSON.stringify(s.mapLead)}, pane ${JSON.stringify(s.paneLayers)}`);
    const dimsAtBoss = model.model.dimensions.filter((d) => d.from === MAP_BOUND_FEATURE || d.to === MAP_BOUND_FEATURE).map((d) => d.id);
    push("[real] a pin hovered on the map lights its feature's row in the tree (or the closed fold " +
      "holding it), the dimensions at it in the grid, the pin itself and its connector on the map, " +
      "and its bound face in the scene",
      (s.treeHot.indexOf(MAP_BOUND_FEATURE) !== -1 || s.treeHolds.indexOf("hub") !== -1) &&
      dimsAtBoss.every((d) => s.gridHot.indexOf(d) !== -1) &&
      s.mapLead.indexOf("feature:" + MAP_BOUND_FEATURE) !== -1 &&
      s.mapHot.indexOf("interface:" + MAP_BOUND_EDGE) !== -1 &&
      !!s.paneLayers && s.paneLayers.some((l) => l.role === "hover" && l.tier === "own" && l.faces > 0));
    await restHover();
    s = await surfaces();
    push("[real] ...and the pointer leaving the map lets the hover go on every surface",
      s.mapLead.length === 0 && s.treeHot.length === 0 && s.gridHot.length === 0);

    // --- 6. hover, tree and grid -> map ----------------------------------------
    await page.locator("#navtree " + navRow("part", "hub")).first().hover({ timeout: 5000 });
    await settle();
    s = await surfaces();
    console.log(`      [${label}] hub row hovered: map lead ${JSON.stringify(s.mapLead)}, map hot ${JSON.stringify(s.mapHot)}`);
    const hubFeatures = model.model.parts.find((p) => p.id === "hub").features;
    push("[real] a part's row hovered in the tree lights its box, its name and its pins on the map as own, " +
      "and the interfaces to its neighbours as touching",
      s.mapLead.indexOf("part:hub") !== -1 &&
      hubFeatures.every((f) => s.mapLead.indexOf("feature:" + f) !== -1) &&
      s.mapHot.indexOf("interface:hub_blade1_root_bearing_bore") !== -1 &&
      s.mapHot.indexOf("interface:" + MAP_BOUND_EDGE) !== -1 &&
      s.mapLead.indexOf("part:tan_link_mount_215175_002") === -1);
    await restHover();
    const gridRow = "#topogrid tr.tvrow[data-id=\"tan_link_mount_height\"]";
    await page.locator(gridRow).first().hover({ timeout: 5000 });
    await settle();
    s = await surfaces();
    push("[real] a grid row hovered lights its jumper on the map, and the two pins it measures between",
      s.mapLead.indexOf("dimension:tan_link_mount_height") !== -1 &&
      s.mapLead.indexOf("feature:tan_link_mount_215175_002@tan_link_mount_hub_face") !== -1 &&
      s.mapLead.indexOf("feature:tan_link_mount_215175_002@tan_link_mount_bore") !== -1);
    await restHover();

    // --- 7. select, map -> tree, grid, scene --------------------------------
    await page.locator(`#topopane svg.tv__map g.map__partname[data-map-id="tan_link_mount_215175_002"] text`).first()
      .click({ timeout: 5000, noWaitAfter: true });
    await page.waitForFunction(() => Array.from(document.querySelectorAll("#topopane svg.tv__map [data-map-kind]"))
      .some((n) => /map__box--selected/.test(n.getAttribute("class") || "")), null, { timeout: 10000 }).catch(() => {});
    await untilPane((w) => w.__lastLight && w.__lastLight.layers.some((l) => l.role === "select"), null, 5000);
    await restHover();
    s = await surfaces();
    const mountDims = model.model.parts.find((p) => p.id === "tan_link_mount_215175_002").dimensions;
    console.log(`      [${label}] mount selected on the map: tree on ${JSON.stringify(s.treeOn.slice(0, 8))}..., grid selected ` +
      `${JSON.stringify(s.gridSelected)}, map selected ${s.mapSelected.length}, touched ${s.mapTouched.length}, pane ${JSON.stringify(s.paneLayers)}`);
    push("[real] a part's name clicked on the map selects the part: its row is on in the tree, its " +
      "dimensions' rows are selected in the grid, its box and pins wear the accent and its " +
      "neighbours' interfaces are touched on the map, and the scene's light is the selection's",
      s.treeOn.indexOf("tan_link_mount_215175_002") !== -1 &&
      mountDims.every((d) => s.gridSelected.indexOf(d) !== -1) &&
      s.mapSelected.indexOf("part:tan_link_mount_215175_002") !== -1 &&
      s.mapTouched.indexOf("interface:tan_link_mount_gas_spring_seat") !== -1 &&
      !!s.paneLayers && s.paneLayers.some((l) => l.role === "select" && l.tier === "own"));

    // --- 8. select, tree and grid -> map -------------------------------------
    await page.locator("#navtree " + navRow("feature", MAP_BOUND_FEATURE)).first().click({ timeout: 5000, noWaitAfter: true });
    await page.waitForFunction((sel) => /--selected/.test((document.querySelector(sel) || {}).getAttribute?.("class") || ""),
      mapEl("feature", MAP_BOUND_FEATURE), { timeout: 10000 }).catch(() => {});
    await restHover();
    s = await surfaces();
    push("[real] a feature's row clicked in the tree selects its pin on the map, with the connector it ends touched",
      s.mapSelected.indexOf("feature:" + MAP_BOUND_FEATURE) !== -1 &&
      s.mapTouched.indexOf("interface:" + MAP_BOUND_EDGE) !== -1 &&
      s.mapSelected.indexOf("part:tan_link_mount_215175_002") === -1);
    await page.locator(gridRow).first().click({ timeout: 5000, noWaitAfter: true });
    await page.waitForFunction((sel) => /--selected/.test((document.querySelector(sel) || {}).getAttribute?.("class") || ""),
      mapEl("dimension", "tan_link_mount_height"), { timeout: 10000 }).catch(() => {});
    await restHover();
    s = await surfaces();
    push("[real] a grid row clicked selects its jumper on the map and the two pins it measures between",
      s.mapSelected.indexOf("dimension:tan_link_mount_height") !== -1 &&
      s.mapSelected.indexOf("feature:tan_link_mount_215175_002@tan_link_mount_hub_face") !== -1 &&
      s.mapSelected.indexOf("feature:tan_link_mount_215175_002@tan_link_mount_bore") !== -1);

    // --- 9. select, scene -> map ---------------------------------------------
    // The scene's anchor clicked: the pane posts `annotate:pick` for the node
    // (topology_app.js's onScenePick), as the Preview suite drives it.
    const sha = bound.geometry_key.source_step_sha256;
    const inScene = await untilPane((w, s) => w.__scene.listOpenParts().indexOf(s) !== -1, sha, 60000);
    await inPane((w, nodeId) => {
      new w.Function("msg", "window.parent.postMessage(msg, window.location.origin);")(
        { type: "annotate:pick", kind: "node", id: nodeId });
      return true;
    }, MAP_BOUND_FEATURE.split("@")[1]);
    const picked = await until((sel) => /--selected/.test((document.querySelector(sel) || {}).getAttribute?.("class") || ""),
      mapEl("feature", MAP_BOUND_FEATURE), 15000);
    await restHover();
    s = await surfaces();
    console.log(`      [${label}] the boss's anchor picked in the scene (hub mesh open: ${inScene}): map selected ${JSON.stringify(s.mapSelected)}`);
    push("[real] an anchor picked in the scene selects its feature's pin on the map",
      inScene && picked && s.mapSelected.indexOf("feature:" + MAP_BOUND_FEATURE) !== -1);

    // --- 10. the view: zoom, pan, fit, and a selection brought into view ------
    const fitZoom = await zoomOf();
    const pane = await paneBox();
    const hubBox = await page.evaluate((sel) => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, mapEl("part", "hub"));
    // Six notches in over the hub: the upper piston head, at the far right,
    // leaves the region.
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(hubBox.x, hubBox.y);
      await page.mouse.wheel(0, -100);
      await settle(60);
    }
    const zoomedIn = await zoomOf();
    const upperBefore = await page.evaluate((sel) => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }, mapEl("part", "piston_head_upper_214698_002"));
    console.log(`      [${label}] zoom ${fitZoom} -> ${zoomedIn}; upper head at ${JSON.stringify(upperBefore)} in pane ${JSON.stringify(pane)}`);
    push("[real] the wheel over the map zooms it in, and the far part leaves the region",
      zoomedIn > fitZoom * 1.5 && !inside(upperBefore, pane));
    await page.locator("#navtree " + navRow("part", "piston_head_upper_214698_002")).first().click({ timeout: 5000, noWaitAfter: true });
    await settle(400);
    const upperAfter = await page.evaluate((sel) => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }, mapEl("part", "piston_head_upper_214698_002"));
    const zoomKept = await zoomOf();
    console.log(`      [${label}] after selecting it in the tree: ${JSON.stringify(upperAfter)} at zoom ${zoomKept}`);
    push("[real] a part selected in the tree while its box is off the map's region is panned into view, " +
      "at the reader's zoom",
      inside(upperAfter, pane) && Math.abs(zoomKept - zoomedIn) < 1e-6);
    // A drag on the drawing's empty space pans it.
    const worldBefore = await worldBox();
    await page.mouse.move(pane.left + 40, pane.bottom - 40);
    await page.mouse.down();
    await page.mouse.move(pane.left + 140, pane.bottom - 100, { steps: 5 });
    await page.mouse.up();
    await settle();
    const worldAfter = await worldBox();
    console.log(`      [${label}] drag: ${Math.round(worldBefore.left)} -> ${Math.round(worldAfter.left)}`);
    push("[real] a drag on the map's empty space pans it by the drag",
      Math.abs((worldAfter.left - worldBefore.left) - 100) < 3 && Math.abs((worldAfter.top - worldBefore.top) + 60) < 3);
    await page.evaluate(() => document.getElementById("dag-fit").click());
    await settle();
    const refit = await zoomOf();
    const refitWorld = await worldBox();
    push("[real] Fit brings the whole map back into the region at the fit's zoom",
      Math.abs(refit - fitZoom) < 1e-6 && inside(refitWorld, pane, 2));
    await page.mouse.move(hubBox.x, hubBox.y);
    await page.mouse.wheel(0, -100);
    await settle(100);
    await page.keyboard.press("0");
    await settle();
    push("[real] ...and so does the 0 key", Math.abs((await zoomOf()) - fitZoom) < 1e-6);

    // --- 10b. names, and the box's interior (the_map_is_portrait_as_jeff_drew_it)
    // No jumper strikes through a part's number or name: every jumper's path,
    // walked as the page draws it, against every name line's box as the page
    // lays it out (the walk of 2026-11-16 found three).
    const struck = await page.evaluate(() => {
      const svg = document.querySelector("#topopane svg.tv__map");
      const texts = Array.from(svg.querySelectorAll("g.map__partname text"))
        .map((t) => ({ r: t.getBoundingClientRect(), s: t.textContent }));
      const lines = Array.from(svg.querySelectorAll("path.map__jumperline"));
      const hits = [];
      lines.forEach((p) => {
        const L = p.getTotalLength(), m = p.getScreenCTM();
        for (let i = 0; i <= 200; i++) {
          const q = p.getPointAtLength(L * i / 200).matrixTransform(m);
          const t = texts.find((t) => q.x >= t.r.left && q.x <= t.r.right && q.y >= t.r.top && q.y <= t.r.bottom);
          if (t) { hits.push(p.parentNode.getAttribute("data-map-id") + " x " + t.s); break; }
        }
      });
      return { jumpers: lines.length, texts: texts.length, hits };
    });
    console.log(`      [${label}] ${struck.jumpers} jumpers against ${struck.texts} name lines: ` +
      `${struck.hits.length ? struck.hits.join("; ") : "none crossed"}`);
    push("[real] no jumper crosses a part's number or name on the map",
      struck.jumpers === model.model.counts.dimensions && struck.texts > 0 && struck.hits.length === 0);
    // A point inside a box (or a district's field) where nothing else is: a
    // grid over its rect, the first point the page hands to that element.
    const emptyPointIn = (kind, id, cls) => page.evaluate(({ sel, cls }) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      for (let fy = 0.2; fy <= 0.85; fy += 0.05) {
        for (let fx = 0.15; fx <= 0.85; fx += 0.05) {
          const x = r.left + r.width * fx, y = r.top + r.height * fy;
          const hit = document.elementFromPoint(x, y);
          if (hit && hit.classList && hit.classList.contains(cls) && (hit === el || hit.parentNode === el.parentNode)) return [x, y];
        }
      }
      return null;
    }, { sel: kind === "body" ? `#topopane svg.tv__map rect.map__district[data-map-id="${id}"]`
      : `#topopane svg.tv__map rect.map__boxhit[data-map-id="${id}"]`, cls });
    await page.keyboard.press("Escape");
    await settle();
    const inHub = await emptyPointIn("part", "hub", "map__boxhit");
    if (inHub) {
      await page.mouse.move(inHub[0], inHub[1]);
      await page.mouse.down();
      await page.mouse.up();
    }
    await page.waitForFunction((sel) => /--selected/.test((document.querySelector(sel) || {}).getAttribute?.("class") || ""),
      mapEl("part", "hub") + ".map__box", { timeout: 10000 }).catch(() => {});
    await untilPane((w) => w.__lastLight && w.__lastLight.layers.some((l) => l.role === "select"), null, 5000);
    await restHover();
    s = await surfaces();
    const hubDims = model.model.parts.find((p) => p.id === "hub").dimensions;
    console.log(`      [${label}] a click inside the hub's box at ${JSON.stringify(inHub && inHub.map(Math.round))}: ` +
      `map selected ${s.mapSelected.length}, tree on ${JSON.stringify(s.treeOn.slice(0, 4))}, grid selected ${JSON.stringify(s.gridSelected)}`);
    push("[real] a still click inside a part's box, clear of its name, pins and jumpers, selects the part " +
      "on all four surfaces, as a click on its name does",
      !!inHub && s.mapSelected.indexOf("part:hub") !== -1 && s.treeOn.indexOf("hub") !== -1 &&
      hubDims.every((d) => s.gridSelected.indexOf(d) !== -1) &&
      !!s.paneLayers && s.paneLayers.some((l) => l.role === "select" && l.tier === "own"));
    // A press inside a box that moves is a pan, and selects nothing.
    await page.keyboard.press("Escape");
    await settle();
    const inCover = await emptyPointIn("part", "piston_cover_214958_002", "map__boxhit");
    const beforePress = await worldBox();
    if (inCover) {
      await page.mouse.move(inCover[0], inCover[1]);
      await page.mouse.down();
      await page.mouse.move(inCover[0] + 60, inCover[1] + 40, { steps: 6 });
      await page.mouse.up();
    }
    await settle();
    const afterPress = await worldBox();
    s = await surfaces();
    console.log(`      [${label}] a drag from inside the cover's box: world ${Math.round(beforePress.left)},${Math.round(beforePress.top)} -> ` +
      `${Math.round(afterPress.left)},${Math.round(afterPress.top)}; map selected ${s.mapSelected.length}`);
    push("[real] a press inside a part's box that moves pans the map by the drag, and selects nothing",
      !!inCover && Math.abs((afterPress.left - beforePress.left) - 60) < 3 &&
      Math.abs((afterPress.top - beforePress.top) - 40) < 3 && s.mapSelected.length === 0);
    // A still click on a district's field selects its body.
    const inGround = await emptyPointIn("body", "base", "map__districtfield");
    if (inGround) {
      await page.mouse.move(inGround[0], inGround[1]);
      await page.mouse.down();
      await page.mouse.up();
    }
    await page.waitForFunction((sel) => /--selected/.test((document.querySelector(sel) || {}).getAttribute?.("class") || ""),
      mapEl("body", "base") + ".map__district", { timeout: 10000 }).catch(() => {});
    await restHover();
    s = await surfaces();
    push("[real] a still click on a district's field selects its body",
      !!inGround && s.mapSelected.indexOf("body:base") !== -1);
    await page.keyboard.press("Escape");
    await page.evaluate(() => document.getElementById("dag-fit").click());
    await settle();

    // --- 11. a reload keeps the map --------------------------------------------
    await page.reload({ waitUntil: "load" });
    await pickModel(page, MAP_TOPOLOGY);
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 30000 }).catch(() => {});
    await settle(300);
    push("[real] a reload draws the map again, and nothing remembers a drawing choice",
      await page.evaluate(() => document.querySelectorAll("#topopane svg.tv__map").length === 1 &&
        document.querySelectorAll("#topopane svg.tv__rails").length === 0 &&
        localStorage.getItem("tolstack.viewer.dagDrawing") === null));

    // --- 12. v1 draws its map from computed places -----------------------------
    await pickModel(page, "vpa_pitch_linkage");
    await page.waitForFunction(() => {
      const s = document.querySelector("#topopane svg.tv__map");
      return s && s.getAttribute("data-topology") === "vpa_pitch_linkage";
    }, null, { timeout: 30000 }).catch(() => {});
    await settle(400);
    // In the DAG view: v1's computed map is thirteen bodies wide, and side by
    // side at this width the region asks for a zoom under the map's floor
    // (VA.MAP_ZOOM.min), so Fit's promise is measured where the region has
    // the room.
    await page.evaluate(() => document.querySelector('#pane-view button[data-view="dag"]').click());
    await settle(400);
    await page.evaluate(() => document.getElementById("dag-fit").click());
    await settle(300);
    const v1 = await page.evaluate(() => {
      const svg = document.querySelector("#topopane svg.tv__map");
      if (!svg) return null;
      const ids = (sel) => Array.from(svg.querySelectorAll(sel)).map((n) => n.getAttribute("data-map-id"));
      const boxes = Array.from(svg.querySelectorAll("rect.map__box")).map((b) => b.getBoundingClientRect());
      let overlaps = 0;
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) overlaps++;
        }
      }
      const pane = document.getElementById("topopane").getBoundingClientRect();
      const world = svg.querySelector("g.map__world").getBoundingClientRect();
      return { drawn: { bodies: ids("rect.map__district").length, parts: ids("rect.map__box").length,
          features: ids("g.map__pin").length, dimensions: ids("g.map__jumper").length,
          interfaces: ids("g.map__connector").length },
        overlaps, rails: document.querySelectorAll("#topopane svg.tv__rails").length,
        notes: window.ViewerApp.lastMapLight.geometry.notes.length,
        pane: [Math.round(pane.width), Math.round(pane.height)],
        world: [Math.round(world.left - pane.left), Math.round(world.top - pane.top), Math.round(world.width), Math.round(world.height)],
        zoom: svg.getAttribute("data-zoom"),
        // Every box (the routes may run past the layout's bounds: a defect
        // note of the layout's, counted above).
        inside: boxes.every((b) => b.left >= pane.left - 2 && b.top >= pane.top - 2 &&
          b.right <= pane.right + 2 && b.bottom <= pane.bottom + 2) };
    });
    const lc = legacy.model.counts;
    const v1Expected = { bodies: lc.bodies, parts: lc.parts, features: lc.features, dimensions: lc.dimensions, interfaces: lc.interfaces };
    console.log(`      [${label}] v1: ${JSON.stringify(v1)} for ${JSON.stringify(v1Expected)}`);
    push("[real] v1, which has no layout file, draws its map from computed places: the model's counts, " +
      "no two boxes overlapping, no rails, and in the DAG view Fit puts every part's box inside its region",
      !!v1 && JSON.stringify(v1.drawn) === JSON.stringify(v1Expected) && v1.overlaps === 0 &&
      v1.rails === 0 && v1.inside);
    await page.evaluate(() => document.querySelector('#pane-view button[data-view="both"]').click());
    await settle(300);
    await pickModel(page, MAP_TOPOLOGY);
    await page.waitForFunction(() => {
      const s = document.querySelector("#topopane svg.tv__map");
      return s && s.getAttribute("data-topology") === "vpa_end_stop_v2";
    }, null, { timeout: 30000 }).catch(() => {});
    await settle(300);

    // --- 13. the pane views ----------------------------------------------------
    const bothWidth = (await paneBox()).width;
    await page.evaluate(() => document.querySelector('#pane-view button[data-view="dag"]').click());
    await settle(400);
    const dagView = await page.evaluate(() => {
      const pane = document.getElementById("topopane").getBoundingClientRect();
      const geo = window.ViewerApp.lastMapLight.geometry;
      return {
        width: pane.width,
        map: document.querySelectorAll("#topopane svg.tv__map").length,
        zoom: Number(document.querySelector("#topopane svg.tv__map").getAttribute("data-zoom")),
        // The fit the region's own size asks for, by the rule itself (not by
        // the function under test): the smaller of the two ratios, capped.
        expected: Math.min(pane.width / geo.bounds.w, pane.height / geo.bounds.h, 2),
      };
    });
    console.log(`      [${label}] DAG view: region ${Math.round(dagView.width)} wide (was ${Math.round(bothWidth)}), zoom ${dagView.zoom} for a fit of ${dagView.expected.toFixed(3)}`);
    push("[real] in the DAG view the map takes the wider region, re-fitted",
      dagView.width > bothWidth * 1.5 && dagView.map === 1 && dagView.zoom > fitZoom &&
      Math.abs(dagView.zoom - dagView.expected) < 0.002);
    await page.evaluate(() => document.querySelector('#pane-view button[data-view="3d"]').click());
    await settle(300);
    push("[real] in the 3D view the region is hidden, the map with it",
      await page.evaluate(() => getComputedStyle(document.getElementById("topopane")).display === "none"));
    await page.evaluate(() => document.querySelector('#pane-view button[data-view="both"]').click());
    await settle(300);
    push("[real] side by side again, the map is back in its region",
      await page.evaluate(() => document.querySelectorAll("#topopane svg.tv__map").length === 1 &&
        getComputedStyle(document.getElementById("topopane")).display !== "none"));

    push("[real] nothing threw on the map's page", errors.length === 0);
    if (errors.length) console.log(`      [${label}] errors: ${errors.join(" | ").slice(0, 600)}`);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.close();
  }
  return reportSuite(label, checks, errors);
}

async function testWindowResizeReclamps(browser, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const model = topologies && (topologies.topologies || []).find((t) => t.id === MAP_TOPOLOGY);
  const index = await realDataIndexForTheAnnotator();
  if (!model || !model.map || !index.meshes.length) {
    push("[real] a window resize re-clamps the pane (skipped: the topology projection with the map's " +
      "layout or the meshes are not on disk -- build them, or pass --repo <a root built from this tree>)", true);
    return reportSuite(label, checks, errors);
  }
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 5120, height: 2160 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await installRealAnnotatorReads(page, { meshes: index.meshes, runs: index.runs,
    aliases: index.aliases, binding: "real" });
  const settle = (ms) => page.waitForTimeout(ms);
  const region = () => page.evaluate(() => {
    const r = document.getElementById("topopane").getBoundingClientRect();
    const f = document.getElementById("annotate-flyout");
    return { width: r.width, left: r.left, flyout: f ? f.getBoundingClientRect().width : 0,
      map: document.querySelectorAll("#topopane svg.tv__map").length };
  });
  const open = async () => {
    await page.goto(url + "/apps/viewer/topology.html?topology=" + MAP_TOPOLOGY + "&pane=1", { waitUntil: "load" });
    await pickModel(page, MAP_TOPOLOGY);
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 30000 }).catch(() => {});
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 30000 }).catch(() => {});
    await settle(800);
  };
  try {
    await open();
    const wide = await region();
    await page.setViewportSize({ width: 1920, height: 1080 });
    // Read on the page's own clock, not the wall's: two animation frames are
    // past the resize steps (which run before them in the same frame), so this
    // is the first layout the page could paint at 1920. A fixed settle raced
    // the cold page's ~3 s of 3D-scene work, which held the resize event and
    // the clamp's old debounce both, and read the region in between
    // (the_window_resize_reclamp_holds_on_a_cold_run).
    await page.evaluate(() => new Promise((done) =>
      requestAnimationFrame(() => requestAnimationFrame(() => done()))));
    const shrunk = await region();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await open();
    const fresh = await region();
    console.log(`      [${label}] region ${Math.round(wide.width)} (3D ${Math.round(wide.flyout)}) at 5120 -> ` +
      `${Math.round(shrunk.width)} (3D ${Math.round(shrunk.flyout)}) after the shrink; a fresh load at 1920 gives ` +
      `${Math.round(fresh.width)} (3D ${Math.round(fresh.flyout)})`);
    push("[real] side by side at 5120 has a 3D view and a wide region", wide.flyout > 400 && wide.width > 1000 && wide.map === 1);
    push("[real] shrinking the window to 1920 re-clamps the pane: the region equals a fresh load's (+-2px) and the map is drawn",
      shrunk.width > 100 && Math.abs(shrunk.width - fresh.width) <= 2 && shrunk.map === 1 && wide.width > shrunk.width);
    push("[real] nothing threw on the resize page", errors.length === 0);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.close();
  }
  return reportSuite(label, checks, errors);
}

async function testDagZoom(browser, fileBase, label, realProjection, realCrops) {
  const realResults = await readProjection("results.json");
  const realKinematic = await readProjection("kinematic/kinematic_studies.json");
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const settle = (ms = 120) => page.waitForTimeout(ms);
  // The grid's header and rows, and the map's view, read in the page. The
  // DAG region draws the map (since the_map_is_the_only_drawing_and_classic_
  // retires, 2026-11-17): its zoom is the map's own (`data-zoom`,
  // VA.MAP_ZOOM), its drawing the world group inside the region.
  const read = () => page.evaluate(() => {
    const VA = window.ViewerApp;
    const head = document.querySelector("#topogrid .tv__head");
    const hr = head.getBoundingClientRect();
    const rows = Array.from(document.querySelectorAll("#topogrid tr.tvrow"));
    const gs = document.querySelector("#topogrid .tv__gridscroll");
    const gr = gs.getBoundingClientRect();
    const svg = document.querySelector("#topopane svg.tv__map");
    const world = svg ? svg.querySelector("g.map__world").getBoundingClientRect() : null;
    const pane = document.getElementById("topopane").getBoundingClientRect();
    const part = document.querySelector("#topogrid td.tvcell--part");
    const visible = rows.filter((row) => {
      const b = row.getBoundingClientRect();
      return b.bottom > gr.top + hr.height + 2 && b.top < gr.bottom - 2;
    }).length;
    return {
      k: svg ? Number(svg.getAttribute("data-zoom")) : null,
      world: world ? { left: world.left, top: world.top, right: world.right, bottom: world.bottom,
        width: world.width, height: world.height } : null,
      pane: { left: pane.left, top: pane.top, right: pane.right, bottom: pane.bottom },
      partLeft: part ? part.getBoundingClientRect().left : null,
      rowHeight: rows.length ? rows[0].getBoundingClientRect().height : null,
      headTop: hr.top, headBottom: hr.bottom, headHeight: hr.height,
      gridTop: gr.top, gridScrolled: gs.scrollTop, gridLeft: gs.scrollLeft,
      pinned: gs.scrollTop > 0 && Math.abs(hr.top - gr.top) < 0.5,
      visibleRows: visible,
      firstRowTop: rows.length ? rows[0].getBoundingClientRect().top : null,
      docScroll: document.scrollingElement.scrollTop,
      innerHeight: window.innerHeight,
      min: VA.MAP_ZOOM.min, max: VA.MAP_ZOOM.max, step: VA.MAP_ZOOM.step,
    };
  });
  const insideOf = (r, b, slack = 2) => !!r && r.left >= b.left - slack && r.top >= b.top - slack &&
    r.right <= b.right + slack && r.bottom <= b.bottom + slack;
  try {
    if (!realProjection) {
      push("[real] the DAG's zoom (skipped: the topology projection is not " +
        "built -- build it, or pass --repo <main checkout>)", true);
      return reportSuite(label, checks, errors);
    }
    await page.goto(fileBase + "/topology.html?mock=1", { waitUntil: "load" });
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
    await pickModel(page, "vpa_pitch_linkage");
    await page.waitForSelector("tr.tvrow", { timeout: 5000 });
    await settle(300);

    // --- the header rides with the grid, in the grid's own region ------------
    const gridTo = (y) => page.evaluate((y) => {
      const g = document.querySelector("#topogrid .tv__gridscroll");
      g.scrollTop = y === "end" ? g.scrollHeight : y;
      return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    }, y);
    await gridTo(0);
    await settle();
    const top = await read();
    push("[real] the column header sits directly above the first grid row, " +
      "not above the whole DAG",
      Math.abs(top.headBottom - top.firstRowTop) < 2.5 && top.headTop >= top.gridTop - 0.5);
    push("[real] the header's own height is the stylesheet's, and it is the " +
      "first thing in the grid's own scroller",
      Math.abs(top.headHeight - 26) < 1 &&
      await page.locator("#topogrid .tv__gridscroll > .tv__head").count() === 1 &&
      await page.locator("#topopane .tv__hscroll > .tv__head").count() === 0);
    push("[real] the header takes no padding: its columns are over the grid's own",
      await page.evaluate(() => {
        const head = document.querySelector("#topogrid .tv__head");
        const ht = head.querySelector("table").getBoundingClientRect();
        const bt = document.querySelector("#topogrid table.tvtable").getBoundingClientRect();
        return (parseFloat(head.style.paddingLeft) || 0) === 0 && Math.abs(ht.left - bt.left) < 0.5;
      }));
    const stops = [];
    for (const frac of [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) {
      await page.evaluate((f) => {
        const g = document.querySelector("#topogrid .tv__gridscroll");
        g.scrollTop = f * (g.scrollHeight - g.clientHeight);
        return new Promise((done) => requestAnimationFrame(() =>
          requestAnimationFrame(done)));
      }, frac);
      await settle(60);
      stops.push(await read());
    }
    const withRows = stops.filter((s) => s.visibleRows > 0);
    console.log(`      header: ${withRows.length} of ${stops.length} stops had grid rows on screen`);
    push("[real] scrolled down the grid, the header is on screen whenever a grid row is",
      withRows.length >= 3 && withRows.every((s) =>
        s.headTop >= s.gridTop - 0.5 && s.headBottom <= s.innerHeight));
    push("[real] ...and past the grid's first screen it is held at the top of the grid's region",
      withRows.filter((s) => s.pinned).length >= 3 && withRows.filter((s) => s.gridScrolled > 0)
        .every((s) => Math.abs(s.headTop - s.gridTop) < 0.5) &&
      stops.every((s) => s.docScroll === 0));
    await gridTo(0);
    await settle();

    // --- the map's wheel zooms about the pointer, on the end-stop model -------
    // (v2: its map fits this region; v1's, thirteen bodies wide, asks for a
    // zoom under the map's floor here and is the map suite's, in the DAG view.)
    await pickModel(page, "vpa_end_stop_v2");
    await page.waitForFunction(() => {
      const s = document.querySelector("#topopane svg.tv__map");
      return s && s.getAttribute("data-topology") === "vpa_end_stop_v2";
    }, null, { timeout: 30000 });
    await settle(300);
    // A point on the map's empty space: the SVG's own background.
    const findEmpty = (margin = 20) => page.evaluate((margin) => {
      const svg = document.querySelector("#topopane svg.tv__map");
      const b = svg.getBoundingClientRect();
      for (let y = b.top + margin; y < Math.min(b.bottom, innerHeight) - margin; y += 9) {
        for (let x = b.left + margin; x < b.right - margin; x += 7) {
          const hit = document.elementFromPoint(x, y);
          if (hit === svg) return { x, y };
        }
      }
      return null;
    }, margin);
    const emptyPoint = await findEmpty();
    push("[real] the drawing has empty space to point at", !!emptyPoint);
    const before = await read();
    await page.mouse.move(emptyPoint.x, emptyPoint.y);
    await page.mouse.wheel(0, -100);
    await settle(200);
    const zoomedIn = await read();
    console.log(`      wheel notch: ${before.k.toFixed(3)} -> ${zoomedIn.k.toFixed(3)}`);
    push("[real] one wheel notch toward the reader zooms in one step",
      Math.abs(zoomedIn.k / before.k - before.step) < 0.01);
    push("[real] a zoom leaves the grid's sideways scroll at the left edge",
      zoomedIn.gridLeft === 0);
    push("[real] a zoom scales the map alone: the grid's rows and header keep their own size",
      Math.abs(zoomedIn.rowHeight - before.rowHeight) < 0.5 &&
      Math.abs(zoomedIn.headHeight - before.headHeight) < 0.5 &&
      zoomedIn.world.height > before.world.height * 1.05 &&
      Math.abs(zoomedIn.partLeft - before.partLeft) < 0.5);
    await page.mouse.wheel(0, 100);
    await page.mouse.wheel(0, 100);
    await page.mouse.wheel(0, 100);
    await settle(200);
    const zoomedOut = await read();
    push("[real] the wheel away from the reader zooms out, and the DAG shrinks with it",
      zoomedOut.k < zoomedIn.k && zoomedOut.world.height < zoomedIn.world.height);
    for (let i = 0; i < 40; i++) await page.mouse.wheel(0, 100);
    await settle(250);
    const floorK = await read();
    console.log(`      zoom floor: ${floorK.k.toFixed(4)} against a minimum of ${floorK.min}`);
    push("[real] the zoom stops at its minimum", Math.abs(floorK.k - floorK.min) < 0.002);
    for (let i = 0; i < 60; i++) await page.mouse.wheel(0, -100);
    await settle(250);
    const ceilK = await read();
    console.log(`      zoom ceiling: ${ceilK.k.toFixed(4)} against a maximum of ${ceilK.max}`);
    push("[real] ...and at its maximum", Math.abs(ceilK.k - ceilK.max) < 0.002);

    // A plain wheel over the GRID scrolls the grid rather than zooming.
    await page.keyboard.press("0");
    await settle(250);
    const gridPoint = await page.evaluate(() => {
      const row = document.querySelector("#topogrid tr.tvrow");
      const b = row.getBoundingClientRect();
      return { x: b.left + 60, y: Math.min(Math.max(b.top, 200) + 4, innerHeight - 40) };
    });
    const kBeforeGrid = (await read()).k;
    await page.mouse.move(gridPoint.x, gridPoint.y);
    await page.mouse.wheel(0, -100);
    await settle(150);
    push("[real] a plain wheel over the grid leaves the zoom alone",
      Math.abs((await read()).k - kBeforeGrid) < 1e-6);

    // --- Fit -----------------------------------------------------------------
    const aim = await findEmpty();
    await page.mouse.move(aim.x, aim.y);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -100);
    await settle(200);
    const zoomedFirst = await read();
    await page.locator("#dag-fit").click();
    await settle(250);
    const fitted = await read();
    console.log(`      fit: scale ${zoomedFirst.k.toFixed(3)} -> ${fitted.k.toFixed(3)}`);
    push("[real] Fit shows the whole map at one step",
      fitted.k < zoomedFirst.k && insideOf(fitted.world, fitted.pane));
    const aim2 = await findEmpty();
    await page.mouse.move(aim2.x, aim2.y);
    for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -100);
    await settle(150);
    await page.keyboard.press("0");
    await settle(250);
    push("[real] the 0 key is Fit", Math.abs((await read()).k - fitted.k) < 1e-6);

    // --- the map moves in its own region, the grid in its own ------------------
    {
      const aimW = await findEmpty();
      await page.mouse.move(aimW.x, aimW.y);
      const y0 = (await read()).docScroll;
      let moved = 0;
      for (const d of [-100, -100, 100, -100, 100, 100]) {
        await page.mouse.wheel(0, d);
        await settle(60);
        if (Math.abs((await read()).docScroll - y0) > 0.5) moved++;
      }
      push("[real] a wheel zoom over the drawing never changes the page's scroll", moved === 0);
      const was = await read();
      const from = await findEmpty(40);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(from.x + 80, from.y - 50, { steps: 6 });
      await page.mouse.up();
      await settle();
      const panned = await read();
      console.log(`      pan: world ${Math.round(was.world.left)},${Math.round(was.world.top)} -> ` +
        `${Math.round(panned.world.left)},${Math.round(panned.world.top)}`);
      push("[real] a drag on the drawing's empty space pans the drawing with it",
        Math.abs((panned.world.left - was.world.left) - 80) < 3 &&
        Math.abs((panned.world.top - was.world.top) + 50) < 3 && panned.docScroll === 0);
      push("[real] zoomed, a pan of the map moves the drawing alone, and no column of the grid",
        Math.abs(panned.partLeft - was.partLeft) < 0.5 && panned.gridLeft === was.gridLeft);
    }

    // --- the PART column is never under the DAG; Fit fits both axes ------------
    {
      await page.setViewportSize({ width: 1600, height: 1000 });
      await page.keyboard.press("0");
      await settle(300);
      const fit = await read();
      const aimC = await findEmpty();
      if (aimC) {
        await page.mouse.move(aimC.x, aimC.y);
        for (let i = 0; i < 40 && Math.abs((await read()).k - 1) > 0.08; i++) {
          await page.mouse.wheel(0, (await read()).k < 1 ? -100 : 100);
          await settle(40);
        }
      }
      const one = await read();
      console.log(`      part column left vs the DAG region's right: zoom ${one.k.toFixed(2)}: ` +
        `${one.partLeft} >= ${one.pane.right}; fit ${fit.k.toFixed(2)}: ${fit.partLeft} >= ${fit.pane.right}`);
      push("[real] at zoom 1 the COMPONENT column starts right of the DAG's region",
        Math.abs(one.k - 1) < 0.1 && one.partLeft !== null && one.partLeft >= one.pane.right - 0.5);
      push("[real] ...and at the Fit zoom",
        fit.partLeft !== null && fit.partLeft >= fit.pane.right - 0.5 && fit.world.right <= fit.pane.right + 0.5);
      await page.locator("#dag-fit").click();
      await settle(300);
      const f = await read();
      console.log(`      fit bbox: x ${Math.round(f.world.left)}..${Math.round(f.world.right)} in ` +
        `${Math.round(f.pane.left)}..${Math.round(f.pane.right)}; y ${Math.round(f.world.top)}..` +
        `${Math.round(f.world.bottom)} in ${Math.round(f.pane.top)}..${Math.round(f.pane.bottom)}`);
      push("[real] Fit puts the whole drawing inside the visible window, vertically",
        f.world.top >= f.pane.top - 2 && f.world.bottom <= Math.min(f.pane.bottom, f.innerHeight) + 2);
      push("[real] ...and horizontally inside its pane",
        f.world.left >= f.pane.left - 2 && f.world.right <= f.pane.right + 2);
      push("[real] at the Fit zoom the grid is at its own scale: its rows keep the pitch they have at zoom 1",
        f.k < 1 && Math.abs(f.rowHeight - one.rowHeight) < 0.5);
      await page.setViewportSize({ width: 1400, height: 900 });
      await settle(200);
    }

    // --- a click on the map or the grid never moves the map's view ------------
    // At the fit, everything a click can select is already on screen, so no
    // selection pans it into view (views/map.js's mapBringIntoView).
    {
      await page.keyboard.press("0");
      await settle(300);
      const view = () => page.evaluate(() => {
        const g = document.querySelector("#topopane svg.tv__map g.map__world");
        return g ? g.getAttribute("transform") : null;
      });
      const clicks = [
        ["a pin", "#topopane svg.tv__map g.map__pin"],
        ["a jumper", "#topopane svg.tv__map g.map__jumper path.map__jumperhit"],
        ["a part's name", "#topopane svg.tv__map g.map__partname text"],
        ["a grid row", "#topogrid tr.tvrow td.tvcell--part"],
      ];
      // A point on the element, inside its own region and topmost there.
      const pointOn = (sel) => page.evaluate((sel) => {
        for (const n of document.querySelectorAll(sel)) {
          const region = n.closest("#topopane, #topogrid").getBoundingClientRect();
          const r = n.getBoundingClientRect();
          // Below the grid's pinned header (26px) or the map region's top.
          if (r.height < 2 || r.width < 2 || r.top < region.top + 25.5 || r.bottom > region.bottom - 4 ||
              r.left < region.left - 0.5 || r.right > region.right + 0.5) continue;
          const x = r.left + r.width / 2, y = r.top + r.height / 2;
          const hit = document.elementFromPoint(x, y);
          if (hit && (hit === n || n.contains(hit) || (hit.closest && hit.closest(sel)))) return { x, y };
        }
        return null;
      }, sel);
      const moved = [];
      const clickedOn = [];
      for (const [what, sel] of clicks) {
        const at = await pointOn(sel);
        if (!at) continue;
        const was = await view();
        await page.mouse.move(at.x, at.y);
        await settle(120);
        await page.mouse.click(at.x, at.y);
        await settle(500);
        const now = await view();
        clickedOn.push(what);
        if (now !== was) moved.push(`${what}: ${was} -> ${now}`);
      }
      console.log(`      clicked ${clickedOn.length}: ${clickedOn.join(", ")}` +
        (moved.length ? " -- MOVED: " + moved.join("; ") : ""));
      push("[real] a click on a pin, a jumper, a part's name or a grid row never moves the map: " +
        "its view stays exactly as it was",
        moved.length === 0 && clickedOn.length === clicks.length);
      await page.keyboard.press("Escape");
      await scrollRegionsTop(page);
    }

    // --- the kinematic page --------------------------------------------------
    if (!realResults || !realKinematic) {
      push("[real] the kinematic page's zoom (skipped: the projections are " +
        "not built -- build them, or pass --repo <main checkout>)", true);
      return reportSuite(label, checks, errors);
    }
    await page.goto(fileBase + "/topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops",
      { waitUntil: "load" });
    await page.evaluate(({ topologies, results, crops, kinematic }) => {
      const VA = window.ViewerApp;
      const Fake = function () {
        return new VA.MemoryAdapter({ startState: VA.STATE.READY, topologies,
          results, crops, kinematic, images: {}, texts: {} });
      };
      Fake.isSupported = () => true;
      VA.FsaAdapter = Fake;
      VA.bootTopology();
    }, { topologies: realProjection, results: realResults, crops: realCrops,
         kinematic: realKinematic });
    await page.waitForSelector("div.kmverdict", { timeout: 15000 });
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 15000 });
    await settle(600);
    const kin = () => page.evaluate(() => {
      const pane = document.querySelector("#topopane");
      const gs = document.querySelector("#topogrid .tv__gridscroll");
      const gr = gs.getBoundingClientRect();
      const head = gs.querySelector(".tv__head").getBoundingClientRect();
      const rows = Array.from(gs.querySelectorAll("tr.tvrow")).filter((row) => {
        const b = row.getBoundingClientRect();
        return b.bottom > gr.top + head.height + 1 && b.top < gr.bottom - 1;
      }).length;
      return {
        map: pane.querySelectorAll("svg.tv__map").length,
        topology: (pane.querySelector("svg.tv__map") || { getAttribute: () => null }).getAttribute("data-topology"),
        docScroll: document.scrollingElement.scrollTop,
        gridTop: gr.top, headTop: head.top,
        pinned: gs.scrollTop > 0 && Math.abs(head.top - gr.top) < 0.5,
        rows,
      };
    });
    const kinStart = await kin();
    console.log(`      kinematic page: ${JSON.stringify(kinStart)}`);
    push("[real] the kinematic page's model is the map, in the DAG's region, and the document does not scroll",
      kinStart.map === 1 && kinStart.topology === "vpa_pitch_linkage" && kinStart.docScroll === 0 &&
      kinStart.rows > 0);
    await page.evaluate(() => {
      const gs = document.querySelector("#topogrid .tv__gridscroll");
      const rows = gs.querySelectorAll("tr.tvrow");
      const row = rows[Math.floor(rows.length / 2)];
      if (row) gs.scrollTop += row.getBoundingClientRect().top - gs.getBoundingClientRect().top - 40;
    });
    await settle(150);
    const kinScrolled = await kin();
    console.log(`      kinematic grid scrolled: rows in view ${kinScrolled.rows}, header ` +
      `${Math.round(kinScrolled.headTop)} against the grid region's top ${Math.round(kinScrolled.gridTop)}`);
    push("[real] scrolled down the kinematic page's grid, the header is held " +
      "at the top of the grid's region whenever a grid row is in view",
      kinScrolled.rows > 0 && kinScrolled.pinned);
    await scrollRegionsTop(page);
    await settle(150);

    push("[real] the kinematic page has a pose read-out and no Play button or travel slider of its own",
      await page.locator("#detail input.kmpose__angle").count() === 1 &&
      await page.locator("#detail button.kmpose__play").count() === 0 &&
      await page.locator("#detail input.kmpose__slider").count() === 0);

    // --- no number clips (the_grid_fits_the_screen_and_its_brackets_say_what_
    // nests_in_what, review round 1). On the studies whose totals and part
    // numbers are the longest the projection prints: no number cell and no
    // part cell overflows, and any cell that does carries its whole text as a
    // title.
    {
      const CLIP_STUDIES = [["study", "rotor_fastener_grip_u10h"],
        ["study", "vpa_pitch_linkage_feather_stop_axial_position"],
        ["kinematic", "vpa_pitch_linkage_blade_pitch_at_the_stops"]];
      const clipped = [];
      let cells = 0;
      for (const [kind, id] of CLIP_STUDIES) {
        await page.locator(navRow(kind, id)).first().click();
        await settle(1800);
        for (let i = 0; i < 6; i++) {
          const opened = await page.evaluate(() => {
            const shut = [...document.querySelectorAll("#topogrid .tvsub__caret")]
              .filter((c) => c.textContent === "▸");
            shut.forEach((c) => c.click());
            return shut.length;
          });
          if (!opened) break;
          await settle(900);
        }
        const r = await page.evaluate(() => {
          const tds = [...document.querySelectorAll("#topogrid table.tvtable td")];
          return { n: tds.filter((td) => td.textContent.trim()).length,
            bad: tds.filter((td) => td.scrollWidth > td.clientWidth + 0.5).filter((td) =>
              td.classList.contains("num") || td.classList.contains("tvcell--part") ||
              !(td.getAttribute("title") || (td.querySelector("[title]") || {}).title))
              .map((td) => `${td.className.replace(/^tvcell /, "")} ${JSON.stringify(td.textContent.trim())} ` +
                `${td.scrollWidth}/${td.clientWidth}`)
              .concat([...document.querySelectorAll("#topogrid th")]
                .filter((th) => th.scrollWidth > th.clientWidth + 0.5)
                .map((th) => `header ${JSON.stringify(th.textContent.trim())} ` +
                  `${th.scrollWidth}/${th.clientWidth}`)) };
        });
        cells += r.n;
        r.bad.forEach((b) => clipped.push(`${id}: ${b}`));
      }
      console.log(`      clipping: ${cells} cells on ${CLIP_STUDIES.length} studies; ` +
        `clipped without a title, or a number: ${clipped.length ? clipped.join("; ") : "none"}`);
      push("[real] no grid number and no part number clips, totals rows included, and a cell " +
        "that does clip says its whole text on hover",
        cells > 100 && clipped.length === 0);
      await page.locator(navRow("kinematic", "vpa_pitch_linkage_blade_pitch_at_the_stops")).first().click();
      await settle(1800);
      await scrollRegionsTop(page);
      await settle(300);
    }

    // --- the title, the settings bar and the grid header stay put -------------
    {
      await page.keyboard.press("0");
      await settle(300);
      const at = () => page.evaluate(() => {
        const rect = (sel) => { const n = document.querySelector(sel); return n ? n.getBoundingClientRect() : null; };
        const gs = document.querySelector("#topogrid .tv__gridscroll");
        const bar = rect(".topbar"), tools = rect("#toolbar"), head = rect("#topogrid .tv__head");
        return { gridScroll: gs.scrollTop, gridTop: gs.getBoundingClientRect().top,
          bar: bar && bar.top, tools: tools && tools.top, head: head && head.top,
          doc: document.scrollingElement.scrollTop };
      });
      const rest = await at();
      await page.evaluate(() => {
        const gs = document.querySelector("#topogrid .tv__gridscroll");
        gs.scrollTop = gs.scrollHeight;
      });
      await settle(200);
      const pinned = await at();
      console.log(`      after scrolling the grid ${Math.round(pinned.gridScroll)}px: title ${pinned.bar}, ` +
        `settings ${Math.round(pinned.tools)}, grid header ${Math.round(pinned.head)} ` +
        `(region top ${Math.round(pinned.gridTop)})`);
      push("[real] scrolled a long way down the grid, the title, the settings bar and the grid header " +
        "all stay where they were, and the document never moves",
        pinned.gridScroll > 100 && Math.abs(pinned.bar - rest.bar) < 0.5 &&
        Math.abs(pinned.tools - rest.tools) < 0.5 && Math.abs(pinned.head - pinned.gridTop) < 0.5 &&
        pinned.doc === 0);
      await scrollRegionsTop(page);
      await settle(200);
    }

    // --- the Groups checkboxes: the grid's brackets ---------------------------
    const groupsNow = () => page.evaluate(() => ({
      button: document.querySelector("#group-kinds-toggle").textContent,
      bodies: document.querySelectorAll("#topogrid div.tvbrace--body").length,
      parts: document.querySelectorAll("#topogrid div.tvbrace--part").length,
      map: document.querySelectorAll("#topopane svg.tv__map [data-map-kind]").length,
    }));
    const groupsBoth = await groupsNow();
    await page.locator("#group-kinds-toggle").click();
    const tick = async (kind) => {
      await page.locator(`#group-kinds input[data-kind="${kind}"]`).click();
      await settle(200);
      return groupsNow();
    };
    const noBodies = await tick("bodies");
    const noParts = await tick("parts");
    console.log(`      groups: ${JSON.stringify([groupsBoth, noBodies, noParts])}`);
    push("[real] each Groups checkbox hides exactly its own kind's brackets in the grid, the map " +
      "is drawn as before, and the popover stays open while it is ticked",
      groupsBoth.button === "Groups (2 of 2)" && groupsBoth.bodies > 0 && groupsBoth.parts > 0 &&
      noBodies.bodies === 0 && noBodies.parts === groupsBoth.parts &&
      noParts.parts === 0 && noParts.button === "Groups (0 of 2)" &&
      noParts.map === groupsBoth.map &&
      await page.locator("#group-kinds").getAttribute("open") !== null);
    await tick("bodies"); await tick("parts");
    const back = await groupsNow();
    push("[real] ticking them all again restores every bracket",
      back.bodies === groupsBoth.bodies && back.parts === groupsBoth.parts);

    // --- both models: outlines, inks, Compact, Groups -------------------------
    const OUTLINES = () => page.evaluate(() => {
      const VA = window.ViewerApp;
      const n = (sel) => document.querySelectorAll(sel).length;
      const inks = (sel, prop) => Array.from(new Set(Array.from(
        document.querySelectorAll(sel)).map((el) => getComputedStyle(el)[prop]))).sort();
      const world = document.querySelector("#topopane svg.tv__map g.map__world");
      return {
        topology: VA.lastTopoRender && VA.lastTopoRender.topologyId,
        rowHeight: VA.RAIL_METRICS.rowHeight,
        mapBody: n("#topopane rect.map__district"), mapPart: n("#topopane rect.map__box"),
        gridBody: n("#topogrid div.tvbrace--body"), gridPart: n("#topogrid div.tvbrace--part"),
        view: world ? world.getAttribute("transform") : null,
        mapInks: inks("#topopane rect.map__district", "stroke"),
        gridInks: inks("#topogrid div.tvbrace--body", "borderTopColor"),
      };
    });
    const groupBox = async (kind, on) => {
      const box = page.locator(`#group-kinds input[data-kind="${kind}"]`);
      if ((await page.locator("#group-kinds").getAttribute("open")) === null) {
        await page.locator("#group-kinds-toggle").click();
      }
      if ((await box.isChecked()) !== on) await box.click();
      await settle(200);
    };
    const nested = [];
    for (const topoId of ["vpa_end_stop_v2", "vpa_pitch_linkage"]) {
      await pickModel(page, topoId);
      await page.waitForFunction((id) => window.ViewerApp.lastTopoRender &&
        window.ViewerApp.lastTopoRender.topologyId === id, topoId, { timeout: 30000 });
      await settle(300);
      const all = await OUTLINES();
      await page.locator("#density-toggle").click();
      await settle(300);
      const compact = await OUTLINES();
      await page.locator("#density-toggle").click();
      await settle(300);
      await groupBox("parts", false);
      const noParts = await OUTLINES();
      await groupBox("parts", true);
      await groupBox("bodies", false);
      const noBodies = await OUTLINES();
      await groupBox("bodies", true);
      await page.click("body", { position: { x: 2, y: 2 } }).catch(() => {});
      nested.push({ topoId, all, compact, noParts, noBodies });
    }
    const onBoth = (fn) => nested.length === 2 && nested.every(fn);
    nested.forEach((m) => console.log("    " + m.topoId + ": " + JSON.stringify({
      map: [m.all.mapBody, m.all.mapPart], grid: [m.all.gridBody, m.all.gridPart],
      rows: [m.all.rowHeight, m.compact.rowHeight], inks: [m.all.mapInks, m.all.gridInks],
      off: [m.noParts.gridPart, m.noBodies.gridBody] })));
    push("[real] on both models every body is a district and every part a box on the map, and " +
      "the grid brackets both",
      onBoth((m) => m.all.topology === m.topoId && m.all.mapBody > 0 && m.all.mapPart > 0 &&
        m.all.gridBody > 0 && m.all.gridPart > 0));
    push("[real] on both models the map's districts and the grid's body brackets wear the same inks",
      onBoth((m) => m.all.mapInks.length > 1 &&
        JSON.stringify(m.all.mapInks) === JSON.stringify(m.all.gridInks)));
    push("[real] on both models Compact packs the grid's rows and leaves the map as it was",
      onBoth((m) => m.compact.rowHeight < m.all.rowHeight && m.compact.view === m.all.view &&
        m.compact.mapPart === m.all.mapPart));
    push("[real] on both models Parts off removes every part bracket in the grid, Bodies off every " +
      "body bracket, and the map is drawn as before",
      onBoth((m) => m.noParts.gridPart === 0 && m.noParts.gridBody === m.all.gridBody &&
        m.noBodies.gridBody === 0 && m.noBodies.gridPart > 0 &&
        m.noParts.mapPart === m.all.mapPart && m.noBodies.mapBody === m.all.mapBody));
    await page.evaluate(() => {
      try { localStorage.removeItem("tolstack.viewer.groupKinds"); } catch (e) { /* none */ }
    });
    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
  }
}

// --- the point export (a_point_exports_its_xyz_against_angle) ----------------
//
// The kinematic page's results pane offers "Export points": pick two joint
// ends of the live P2 run, download, and parse the file. The adapter is the
// memory one with the one extra read a served transport has (readDataJson), so
// the control is the real one, fed the run file the projection publishes.
async function testSweepExport(browser, fileBase, label, realProjection, realCrops) {
  const realResults = await readProjection("results.json");
  const realKinematic = await readProjection("kinematic/kinematic_studies.json");
  const runId = realKinematic && realKinematic.studies[0].sweep.run_id;
  const sweepDoc = runId && await readProjection(`kinematic/sweeps/${runId}.json`);
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  if (!realResults || !realKinematic || !sweepDoc) {
    push("[real] the point export (skipped: the projections are not built -- " +
      "build them, or pass --repo <main checkout>)", true);
    return reportSuite(label, checks);
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await page.goto(fileBase + "/topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops",
      { waitUntil: "load" });
    await page.evaluate(({ topologies, results, crops, kinematic, doc }) => {
      const VA = window.ViewerApp;
      try { localStorage.removeItem("tolstack.sweepExport.v1"); } catch (e) { /* none */ }
      const Fake = function () {
        const a = new VA.MemoryAdapter({ startState: VA.STATE.READY, topologies,
          results, crops, kinematic, images: {}, texts: {} });
        a.readDataJson = () => Promise.resolve(doc);
        return a;
      };
      Fake.isSupported = () => true;
      VA.FsaAdapter = Fake;
      VA.bootTopology();
    }, { topologies: realProjection, results: realResults, crops: realCrops,
         kinematic: realKinematic, doc: sweepDoc });
    await page.waitForSelector("div.kmverdict", { timeout: 15000 });
    await page.locator(".sx__toggle").click();
    await page.waitForSelector(".sx__row", { timeout: 5000 });
    await page.locator(".sx__search").fill("tan link");
    const shown = await page.locator(".sx__row:visible").count();
    push("[real] searching the picker narrows it to the tangential link's two ends", shown === 2);
    await page.locator('input[data-point="joint|tan_link|b"]').check();
    await page.locator('input[data-point="joint|tan_link|a"]').check();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator(".sx__go").click(),
    ]);
    const chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    const lines = Buffer.concat(chunks).toString("utf8").split("\n");
    const header = lines[2].split(",");
    const data = lines.slice(3).filter((l) => l !== "");
    const at = (row, name) => {
      const i = header.indexOf(name + "_X");
      return row.split(",").slice(i, i + 3).map(Number);
    };
    push("[real] the download is named for the run and the points",
      download.suggestedFilename() === `${runId}_tan_link_a_end+tan_link_b_end_xyz_vs_angle.csv`);
    push("[real] the file has 80 data rows under a comment header naming the run",
      data.length === 80 && lines[0].includes(runId));
    push("[real] the tangential link's plate end at -7 and +72 degrees is where the hand-made sheet put it",
      JSON.stringify(at(data[0], "tan_link_b_end")) === "[80.708,11.329,144.132]" &&
      JSON.stringify(at(data[79], "tan_link_b_end")) === "[80.998,9.027,79.666]");
    push("[real] its mount end never moves",
      data.every((row) => JSON.stringify(at(row, "tan_link_a_end")) === "[79.428,62.43,110.027]"));
    push("[real] the choice is remembered for the next visit", await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem("tolstack.sweepExport.v1")).ids.length === 2;
      } catch (e) { return false; }
    }));
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
      await pickModel(page, topology.id);
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
      await pickModel(page, paneRow.topology);
      await page.waitForSelector(row, { timeout: 5000 });
      await clearPoint(page, `${row} td.tvcell--name`, "click");
      await page.waitForFunction(
        (png) => (window.__CROP_FETCHES__ || []).indexOf(png) !== -1,
        paneRow.companion, { timeout: 5000 }).catch(() => {});
      // ...and the PREVIEW's, which is a different list builder
      // (topology_app.js's fetchPreviewImages) with the same companion term in
      // it: hovering another row previews it without selecting it.
      const trigger = `tr.tvrow[data-id="${cardRow.edge}"]`;
      await pickModel(page, cardRow.topology);
      await page.waitForSelector(trigger, { timeout: 5000 });
      await clearPoint(page, `${trigger} td.tvcell--nominal`, "hover");
      await page.waitForFunction((key) => {
        const p = document.querySelector(".detail__preview");
        return p && p.getAttribute("data-preview-key") === key;
      }, "edge|" + cardRow.edge, { timeout: 5000 }).catch(() => {});
      await page.waitForFunction(
        (png) => (window.__CROP_FETCHES__ || []).indexOf(png) !== -1,
        cardRow.companion, { timeout: 5000 }).catch(() => {});
      await page.mouse.move(4, 4);
      fetched = await page.evaluate(() => window.__CROP_FETCHES__ || []);
    }
    push("the open topology's own crop images are fetched",
      !!paneRow && fetched.indexOf(paneRow.png) !== -1);
    push("selecting a balloon crop's row fetches its parts-list companion " +
      "too, so the PANE's second image is there with the first rather than " +
      "a paint later",
      !!paneRow && fetched.indexOf(paneRow.companion) !== -1);
    push("previewing a balloon crop's row fetches its parts-list companion " +
      "too — the Preview's list is built separately and carries the same " +
      "second image",
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
      await pickModel(page, topology.id);
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });
      // A row whose edge has a crop key: its Preview holds the crop (the grid
      // shows none since the_grid_fits_the_screen_and_its_brackets_say_what_
      // nests_in_what).
      const keyed = (topology.edges || []).filter((e) => e.crop_key).map((e) => e.id);
      const withCrop = page.locator(keyed.map((id) => `tr.tvrow[data-id="${id}"]`).join(", ") ||
        "tr.tvrow--none").first();
      if (await withCrop.count() === 0) continue;
      await withCrop.evaluate((tr) => tr.click());
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
      // The lock is the body class (style.css's `body.lightbox-open`): since the
      // fixed shell (2026-11-14) the document never scrolls, so the body's own
      // computed overflow is hidden with or without it, and the class is what
      // keeps a region behind the dialog from taking the wheel.
      const scrollBefore = await page.evaluate(
        () => document.body.classList.contains("lightbox-open") ? "hidden" : "unlocked");
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
          overflow: document.body.classList.contains("lightbox-open") ? "hidden" : "unlocked",
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
      // The page's OWN scroll offset, read before the gesture rather than
      // assumed to be zero. Getting the launcher on screen is a real scroll
      // (Playwright scrolls a target into view before clicking it), so
      // whether this page happens to sit at 0 by the time the lightbox is up
      // is a fact about how tall the rest of the page is -- which is not what
      // this check is about, and which moved the first time the nav rail's
      // rows stopped being two lines tall (2026-09-22). What the check means
      // is that THE WHEEL scrolled nothing, so it measures the delta.
      const scrollAtOpen = await page.evaluate(() => window.scrollY);
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
        zoomedHere.pageScrollY === scrollAtOpen);
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => !document.querySelector("#crop-lightbox").open &&
              !document.body.classList.contains("lightbox-open"),
        null, { timeout: 5000 }).catch(() => {});
      const closedHere = await page.evaluate(() => ({
        open: document.querySelector("#crop-lightbox").open,
        overflow: document.body.classList.contains("lightbox-open") ? "hidden" : "unlocked",
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
    // The subject is `VA.worksheetSubject`'s, replayed here off the same
    // projections: a study row reads its stack's sheet when its chain
    // re-expresses one (`study.stack`), otherwise its topology's; a topology
    // row its own. A deliberate second implementation of a three-line rule --
    // the point is to discover which rows really hit the adapter, and asking
    // the page under test would agree with whatever it does.
    const withWorksheet = new Set();
    for (const topology of realProjection.topologies) {
      if (topology.worksheet_file) withWorksheet.add("topology:" + topology.id);
      for (const study of topology.studies || []) {
        const sheet = study.stack ? study.stack.worksheet_file : topology.worksheet_file;
        if (sheet) withWorksheet.add("study:" + topology.id + "/" + study.id);
      }
    }
    for (const stack of realResults.stacks) {
      if (stack.worksheet_file) withWorksheet.add("stack:" + stack.id);
    }
    // Only the open model lists its studies (2026-11-08), so the rail's rows
    // are gathered with each model open in turn, in the order a reader meets
    // them, and `clickRow` opens a study's model before clicking the study.
    // The rows that NAVIGATE: a model (an option of the picker), a study, a
    // kinematic study, a loose stack. The tree's body, part, feature and
    // interface rows carry data-nav-kind too (2026-11-10) and are not pages.
    const listRows = () => page.evaluate(() =>
      Array.prototype.map.call(
        document.querySelectorAll('#navtree [data-nav-kind="topology"], #navtree [data-nav-kind="study"], ' +
          '#navtree [data-nav-kind="kinematic"], #navtree [data-nav-kind="stack"]'),
        (row) => ({ kind: row.getAttribute("data-nav-kind"),
                    id: row.getAttribute("data-nav-id"),
                    topologyId: row.getAttribute("data-topology-id") })));
    const clickRow = async (row) => {
      if (row.kind === "topology") { await pickModel(page, row.id); return; }
      if (row.kind === "stack") { await pickStack(page, row.id); return; }
      if ((row.kind === "study" || row.kind === "kinematic") &&
          await page.locator(`#navtree ${navRow(row.kind, row.id)}`).count() === 0) {
        await pickModel(page, row.topologyId);
      }
      await page.locator(`#navtree ${navRow(row.kind, row.id)}`).click();
    };
    // "The click landed": a study's or kinematic study's row lights; a model
    // or a loose stack is the picker's value, and its page is painted.
    const rowShown = async (row, timeout = 4000) => {
      if (row.kind === "topology" || row.kind === "stack") {
        await page.waitForFunction(([kind, id]) => document.querySelector(
          "#navtree select.navtree__select").value === kind + ":" + id &&
          (kind === "stack" ? !!document.querySelector("#stackview tr.el-row")
            : !!(window.ViewerApp.lastTopoRender && window.ViewerApp.lastTopoRender.topologyId === id)),
        [row.kind, row.id], { timeout });
      } else {
        await page.waitForSelector(`#navtree ${navRow(row.kind, row.id)}.navtree__row--on`, { timeout });
      }
    };
    const gathered = [];
    const seenRow = new Set();
    const modelIds = (await listRows()).filter((r) => r.kind === "topology").map((r) => r.id);
    for (const modelId of modelIds) {
      await pickModel(page, modelId);
      await page.waitForTimeout(300);
      for (const row of await listRows()) {
        const key = row.kind + ":" + row.id;
        if (!seenRow.has(key)) { seenRow.add(key); gathered.push(row); }
      }
    }
    const rows = gathered.map((row) => Object.assign(row, {
      reads: withWorksheet.has(
        row.kind === "study" ? "study:" + row.topologyId + "/" + row.id
          : row.kind + ":" + row.id),
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
      await clickRow(row);
      try {
        await rowShown(row);
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
      await clickRow(readers[0]);
      await rowShown(readers[0]);
      afterRead = await openSheet();
      await page.evaluate(() => { window.__WORKSHEETS_FAIL__ = true; });
      await clickRow(readers[1]);
      await rowShown(readers[1]);
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
      await clickRow(reader);
      await page.waitForSelector(".banner__error", { timeout: 4000 });
      await page.evaluate(() => { window.__WORKSHEETS_FAIL__ = false; });
      await clickRow(reader);
      await rowShown(reader);
      cleared = (await page.locator(".banner__error").count()) === 0;
    } catch {
      // Swallowed on purpose. A wedged page never raises the banner this waits
      // for, and a timeout thrown from here would take the whole suite down as
      // an ERROR -- which carries no check name, so the mutation-witness tier
      // reports it as a MISS rather than as the red it is
      // (scripts/mutation_witnesses/README.md, "One thing a spec cannot declare").
      await page.evaluate(() => { window.__WORKSHEETS_FAIL__ = false; });
    }
    push("a read that works clears the banner a failed one wrote", cleared);

    // Pass 2: reads resolving. Same rows, and now no banner may appear at all
    // -- the containment must not be paying for itself with a false alarm.
    const noisy = [];
    for (const row of rows) {
      await clickRow(row);
      try {
        await rowShown(row);
      } catch {
        wedged.push(`${row.kind}:${row.id} (reads working)`);
        continue;
      }
      if (await page.locator(".banner__error").count()) noisy.push(`${row.kind}:${row.id}`);
    }
    push("every row lands with no error banner at all when the reads work",
      noisy.length === 0 && wedged.length === 0);
    if (noisy.length) console.log(`    banner raised on: ${noisy.join(", ")}`);

    // The three converted stacks' sheets are reachable, each from a study
    // whose chain re-expresses it (a_study_shows_the_worksheet_and_joint_of_
    // the_stack_it_folds, 2026-10-27; filed as
    // ISSUE_20261027_the_fastener_stacks_worksheets_have_no_page_since_the_fold.md
    // while they had no page). Over this seam `texts` is empty, so the dialog
    // cannot show the markdown -- what it must show is that it is offering the
    // STACK's sheet, by name, and it must offer the button at all; and the
    // joint block must be that stack's. One study per stack: the first met.
    const byStack = new Map();
    for (const topology of realProjection.topologies) {
      for (const study of topology.studies || []) {
        if (study.stack && !byStack.has(study.stack.id)) {
          byStack.set(study.stack.id, { topology, study });
        }
      }
    }
    const sheetsReached = [];
    const jointsShown = [];
    const sheetlessHidden = [];
    for (const [stackId, { topology, study }] of byStack) {
      // The study's row exists only with its model open (2026-11-08).
      await clickRow({ kind: "study", id: study.id, topologyId: topology.id });
      await rowShown({ kind: "study", id: study.id });
      const jointText = await page.locator("#topojoint").textContent();
      if (jointText.includes(String(study.stack.joint.assembly_drawing)) &&
          jointText.includes(String(study.stack.joint.view))) {
        jointsShown.push(stackId);
      }
      const toggle = await page.locator("#worksheet-toggle").isVisible();
      if (!study.stack.worksheet_file) {
        if (!toggle) sheetlessHidden.push(stackId);
        continue;
      }
      if (!toggle) continue;
      await page.locator("#worksheet-toggle").click();
      await page.waitForSelector("#worksheet-dialog[open]", { timeout: 5000 });
      if ((await page.locator("#worksheet-dialog").textContent())
        .includes(study.stack.worksheet_file)) sheetsReached.push(stackId);
      await page.locator("#worksheet-close").click();
    }
    push("[real] the three converted stacks' sheets are reachable, each from " +
      "a study whose chain re-expresses it, and the dialog names that sheet",
      JSON.stringify(sheetsReached.sort()) === JSON.stringify(
        ["pitch_link_to_pitch_plate", "rotor_fastener_length",
         "vpa_output_to_pitch_plate"]));
    if (sheetsReached.length !== 3) console.log(`    reached: ${sheetsReached.join(", ")}`);
    push("[real] each of the four folded stacks' studies shows that stack's " +
      "joint block", jointsShown.length === 4);
    if (jointsShown.length !== 4) console.log(`    joints: ${jointsShown.join(", ")}`);
    push("[real] the stack with no sheet of its own offers none, rather than " +
      "the model's", sheetlessHidden.length === 1);

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
        "?topology=vpa_pitch_linkage&study=pitch_system_gas_spring_branch",
        { waitUntil: "load" });
      await page.waitForSelector("tfoot.tvfoot", { timeout: 15000 });
      push("[real] a deep link opens the named study selected, over the real " +
        "served transport",
        // The study's id is the summary heading's hover now, not printed
        // beside its title (viewer_summary_balance_sheet: an id is a
        // deep-link handle, not a label) -- so the deep link's own claim is
        // read off the attribute the page really carries.
        await page.locator("#totals h2.tvsum__title")
          .getAttribute("title") === "pitch_system_gas_spring_branch" &&
        await page.locator("tfoot.tvfoot").count() === 1);

      // Edge hover on a crop-bearing edge, over the real served transport:
      // the Preview, with the REAL crop PNG rendered (a_preview_pane_replaces_
      // the_hover_popups_and_one_record_backs_every_mark; the edge card until
      // 2026-10-30).
      // The grid shows no crop since the_grid_fits_the_screen_and_its_
      // brackets_say_what_nests_in_what, so the crop-bearing row is found off
      // the projection: the first of the study's rows whose edge has a crop
      // key and whose Preview, hovered, shows the real PNG.
      const keyedIds = (realProjection.topologies || []).flatMap((t) => t.edges || [])
        .filter((e) => e.crop_key).map((e) => e.id);
      const onPage = await page.evaluate((ids) => ids.filter((id) =>
        document.querySelector(`#topogrid tr.tvrow[data-id="${id}"]`)), keyedIds);
      const previewOf = (key) => page.waitForFunction((key) => {
        const p = document.querySelector(".detail__preview");
        return !!p && p.getAttribute("data-preview-key") === key &&
          !!p.querySelector(".detail__previewbody img.detail__crop-img, .detail__previewbody .detail__side");
      }, key, { timeout: 15000 }).then(() => true).catch(() => false);
      // A real pointer onto a map mark: the map fitted whole (Fit), then the
      // first point along a connector's or a jumper's hit path (or on a pin's
      // dot) that the browser says is the mark's own -- the product model's
      // map is dense at the fit's zoom, so a fixed point can land on a route
      // crossing it. None found: a wheel zooms in about the mark and it is
      // looked for again.
      const hoverMapMark = async (sel) => {
        await page.locator("#dag-fit").click();
        await page.waitForTimeout(150);
        const find = () => page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const own = (x, y) => {
            const hit = document.elementFromPoint(x, y);
            return !!hit && el.contains(hit);
          };
          const path = el.querySelector("path.map__connectorhit, path.map__jumperhit");
          const pts = [];
          if (path) {
            const m = path.getScreenCTM();
            const len = path.getTotalLength();
            for (let i = 1; i < 40; i++) {
              const q = path.getPointAtLength(len * i / 40);
              pts.push({ x: m.a * q.x + m.c * q.y + m.e, y: m.b * q.x + m.d * q.y + m.f });
            }
          } else {
            const b = (el.querySelector("circle.map__pindot") || el).getBoundingClientRect();
            pts.push({ x: b.left + b.width / 2, y: b.top + b.height / 2 });
          }
          const hit = pts.find((pt) => own(pt.x, pt.y));
          return hit ? { at: hit } : { near: pts[Math.floor(pts.length / 2)] };
        }, sel);
        let got = await find();
        for (let i = 0; got && !got.at && i < 3; i++) {
          await page.mouse.move(got.near.x, got.near.y);
          await page.mouse.wheel(0, -480);
          await page.waitForTimeout(150);
          got = await find();
        }
        if (!got || !got.at) return false;
        await page.mouse.move(got.at.x, got.at.y);
        return true;
      };
      let keyedRow = null;
      for (const id of onPage.slice(0, 6)) {
        await clearPoint(page, `tr.tvrow[data-id='${id}'] td.tvcell--nominal`, "hover");
        if (await previewOf("edge|" + id) && await page.locator(
          ".detail__preview .detail__previewbody img.detail__crop-img").count() >= 1) {
          keyedRow = id;
          break;
        }
      }
      push("[real] a pitch_system crop renders in a row's Preview at all",
        !!keyedRow);
      const previewText = () => page.locator(".detail__preview .detail__previewbody").textContent();
      if (keyedRow) {
        await clearPoint(page, `tr.tvrow[data-id='${keyedRow}'] td.tvcell--nominal`, "hover");
        const shown = await previewOf("edge|" + keyedRow);
        const rowText = shown ? await previewText() : null;
        push("[real] hovering the edge's row previews it with the real crop and " +
          "the document it is a crop OF",
          shown && await page.locator(
            ".detail__preview .detail__previewbody img.detail__crop-img").count() >= 1 &&
          / · sheet \d/.test(rowText) && !/authored in topology/.test(rowText));

        // ...and the same edge's own mark on the map previews the same
        // record, real crop image and all.
        await page.mouse.move(4, 4);
        const realBarOpened = await hoverMapMark(
          `svg.tv__map g.map__jumper[data-map-id="${keyedRow}"], ` +
          `svg.tv__map g.map__connector[data-map-id="${keyedRow}"]`) &&
          await previewOf("edge|" + keyedRow);
        const barText = realBarOpened === true ? await previewText() : null;
        push("[real] hovering the edge on pitch_system's map previews the same record",
          realBarOpened === true && barText === rowText);
        await page.mouse.move(4, 4);
      }

      // ...and a real boundary dot. Which node that is comes out of the
      // projection rather than being written down here: a boundary is a node
      // whose incident edges do not all carry the same part, and the most
      // interesting one to hover is the boundary with the most crop-bearing
      // parts around it.
      const boundary = realProjection && (() => {
        const pitch = realProjection.topologies.find((t) => t.id === "vpa_pitch_linkage");
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
        (pitch.parts || []).forEach((part) => {
          names[part.id] = part.display_name || part.name || part.id;
        });
        // A node two parts share is drawn as one connector on the map.
        const shared = {};
        (pitch.nodes || []).forEach((n) => { if ((n.parts || []).length > 1) shared[n.id] = true; });
        return Object.keys(sides)
          .filter((n) => shared[n] && sides[n].length > 1 && sides[n].every((x) => x !== null))
          .map((n) => ({ id: n, parts: sides[n], names: sides[n].map((x) => names[x]),
                         score: sides[n].filter((x) => cropped[x]).length }))
          .sort((a, b) => b.score - a.score)[0] || null;
      })();
      push("[real] pitch_system has a multi-part boundary interface to hover at all",
        !!boundary);
      if (boundary) {
        await hoverMapMark(`svg.tv__map g.map__connector[data-map-id="${boundary.id}"]`);
        await previewOf("node|" + boundary.id);
        const realNode = await previewText();
        push("[real] hovering a pitch_system boundary interface on the map previews " +
          "both parts that meet there",
          boundary.names.every((name) => realNode.includes(name)));
        // Absent is absent, on real data too: a side's picture is there only
        // for a part with a resolved crop.
        const sides = await page.evaluate(() => [...document.querySelectorAll(
          ".detail__preview .detail__side")].map((s) => s.querySelectorAll("img").length));
        push("[real] a node's Preview pictures a side at most once, and only " +
          "where a crop resolves", sides.length > 0 && sides.every((n) => n <= 1));
        await page.mouse.move(4, 4);
      }

      // A real SPEC citation, in the Preview of the L1 fastener grip's row:
      // the NAS6403 sheet, cited and cropped.
      await pickModel(page, "vpa_pitch_linkage");
      await page.waitForSelector("tr.tvrow[data-id='fastener_grip_vpa_out']", { timeout: 15000 });
      await clearPoint(page, "tr.tvrow[data-id='fastener_grip_vpa_out'] td.tvcell--nominal", "click");
      // FROZEN, not merely shown: the pointer is on the row as it clicks, so
      // the row previews at once, and the selection's own repaint lands a
      // fetch later.
      await page.mouse.move(4, 4);
      await page.waitForFunction(() => {
        const p = document.querySelector(".detail__preview");
        return p && p.getAttribute("data-preview-state") === "frozen" &&
          p.getAttribute("data-preview-key") === "edge|fastener_grip_vpa_out";
      }, null, { timeout: 15000 }).catch(() => {});
      const specPane = await previewText();
      push("[real] a real spec citation reaches the row's Preview",
        /NAS6403/.test(specPane));
      push("[real] ...with the real crop of the spec page",
        await page.locator(".detail__preview img.detail__crop-img").count() >= 1);
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
  // 1920 wide since 2026-10-20: the nav rail now stays beside the open panel
  // (the_3d_pane_opens_in_the_mode_the_study_wants), and at 1600 the rail,
  // the preview pane and the reserve leave the panel no room above its floor
  // -- so no drag could narrow it, and the drag checks below would measure
  // the clamp rather than the gesture.
  const page = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
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
    const railsBefore = await page.evaluate(() => {
      const svg = document.querySelector("#topopane svg.tv__map");
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
    // (2026-09-16): the DAG **drawing** is one SVG (the map's, `svg.tv__map`,
    // since 2026-11-17), and `#topopane`
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
      const svg = document.querySelector("#topopane svg.tv__map");
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
    // Since 2026-10-26 (the_shell_seats_the_scene_beside_the_model) the
    // scene is a COLUMN of the page's row, between the nav and the DAG: nav |
    // scene | DAG + grid. It was docked at the window's left edge, with the
    // page shifted out from under it (pane | nav | DAG).
    const docked = await flyoutBox();
    const navOpen = await page.locator("#navtree").boundingBox();
    push("the scene sits between the nav and the DAG -- the nav at the far " +
      "left, the scene against its right edge",
      docked && navOpen && navOpen.x <= 1 && navOpen.width > 0 &&
      Math.abs(docked.x - (navOpen.x + navOpen.width)) <= 1 && docked.width < win.w);
    const railsOpen = await rails();
    push("the DAG DRAWING is drawn, and entirely clear of the panel -- " +
      "adjacency is the deliverable and the drawing is the thing that has to " +
      "survive, not its scrollport",
      railsOpen.visible > 0 && railsOpen.clear);
    push("...and it sits to the panel's RIGHT, which is what 'beside' means",
      railsOpen.left >= docked.x + docked.width);

    // The page YIELDS the room rather than being covered, which is the
    // mechanism that makes the above possible at all: `.tv` starts at the
    // panel's right edge and the nav rail stands down. That reverses the
    // previous "opening it cannot reflow the DAG pane by construction" claim
    // deliberately -- see topology.css -- so the pane MOVING is now the
    // assertion, where it used to be the thing forbidden. (The rail stood
    // down too until 2026-10-20; it now moves over with the page.)
    const paneAfter = await page.locator("#topopane").boundingBox();
    push("opening the flyout moves the DAG pane out from under it, rather " +
      "than leaving it underneath",
      paneBefore && paneAfter && paneAfter.x >= docked.x + docked.width &&
      paneAfter.x > paneBefore.x);
    // The nav STAYS since 2026-10-20 (the_3d_pane_opens_in_the_mode_the_
    // study_wants) -- the pane follows what it selects -- and since 2026-10-26
    // it stays where it is with the scene open: at the far left, the scene
    // to its right.
    push("the nav stays at the far left with the scene open, so a selection " +
      "made in it can follow into the scene",
      navOpen && navOpen.width > 0 && navOpen.x <= 1 &&
      navOpen.x + navOpen.width <= docked.x + 1);
    // One surface: the scene's column wears the page's own background and no
    // border, and the seams either side of it draw no rule at rest.
    const seams = await page.evaluate(() => {
      const css = (sel, pseudo) => getComputedStyle(document.querySelector(sel), pseudo || null);
      return {
        page: getComputedStyle(document.body).backgroundColor,
        scene: css("#annotate-flyout").backgroundColor,
        sceneBorders: ["Left", "Right"].map((s) => css("#annotate-flyout")["border" + s + "Width"]),
        navRule: css("#navtree").borderRightWidth,
        dividerRule: css("#flyout-divider", "::before").backgroundColor,
        detailShown: css("#detail").display !== "none",
      };
    });
    push("no seam: the scene column is the page's background, with no border " +
      "at either side and no hairline on its divider at rest",
      seams.scene === seams.page && seams.sceneBorders.every((w) => w === "0px") &&
      seams.navRule === "0px" && seams.dividerRule === "rgba(0, 0, 0, 0)");
    push("the right-hand pane stays beside the model while the scene is open on a " +
      "topology page", seams.detailShown);
    const reserve = await page.evaluate(() => window.ViewerApp.FLYOUT_WIDTH.reserve);

    // The drag seam, on the edge AWAY from the dock -- so the panel grows into
    // the page rather than off the screen.
    const grip = await page.locator("#flyout-divider").boundingBox();
    push("its drag divider sits on the flyout's RIGHT edge",
      grip && Math.abs((grip.x + grip.width / 2) - (docked.x + docked.width)) <= 4);
    const gripMark = await page.locator("#flyout-divider")
      .evaluate((n) => getComputedStyle(n, "::after").backgroundImage);
    push("the divider shows a grip mark at rest, so nothing has to be " +
      "explained in words",
      gripMark && gripMark !== "none");

    // Real pointer drags on it. At this viewport (1920px, the nav rail and the preview pane at
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
    // Since the fixed shell (2026-11-14) the panel opens at half the middle,
    // which at 1920 is its floor: it is widened first, to the clamp, so the
    // narrowing below has room to happen.
    const opened = await dragBy(400);
    const narrowed = await dragBy(-200);
    push("dragging the divider LEFT narrows the flyout",
      narrowed < opened - 100);
    const widened = await dragBy(160);
    push("dragging the divider RIGHT widens the flyout (the pane's divider " +
      "runs the other way)",
      widened > narrowed + 100);
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
    const maxed = await dragBy(win.w + 2000);
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
    const floorWidth = await page.evaluate(() => window.ViewerApp.FLYOUT_WIDTH.min);
    push("the remembered width is well inside the clamp, so the round-trip " +
      "below is a real one", remembered < maxed - 100 && remembered > floorWidth + 10);
    const storedKey = await page.evaluate(() => window.ViewerApp.FLYOUT_WIDTH_KEY);
    push("the width is written to localStorage under the flyout's own key",
      String(await page.evaluate((k) => window.localStorage.getItem(k), storedKey))
        === String(Math.round(remembered)));
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });
    await page.locator(navRow("study", "demo_base_to_tip")).click();
    await page.waitForSelector("#study-3d", { timeout: 15000 });
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
    await page.locator("#flyout-collapse").click();
    await page.waitForFunction(
      () => !document.body.classList.contains("flyout-open"),
      null, { timeout: 5000 }).catch(() => {});
    // Closing re-fits the map to the restored width; measured a frame on.
    await page.waitForTimeout(100);
    const paneClosed = await page.locator("#topopane").boundingBox();
    const railsClosed = await rails();
    push("closing the flyout puts the page back exactly -- the nav rail, the " +
      "DAG pane's box and the drawing's box all as they were",
      !(await page.locator("#annotate-flyout").evaluate((n) => n.open)) &&
      await page.locator("#navtree").isVisible() &&
      paneClosed.x === paneBefore.x && paneClosed.width === paneBefore.width &&
      railsClosed.left === railsBefore.left &&
      railsClosed.visible === railsBefore.visible);

    // --- no way out to a page of its own --------------------------------------
    //
    // The pane is the shell's: there is no whole annotator to open in a tab.
    await page.locator("#study-3d").click();
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 5000 });
    push("the flyout head carries no link out to a page of its own",
      await page.locator("#annotate-flyout .flyout__head a").count() === 0);

    // The iframe is the real annotate app, same-origin, no mock. It has no
    // banner in the pane any more (handoff the_scene_pane_is_one_flyout_that_
    // reads_over_http), and since the_demo_path_reads_cleanly_on_a_projector
    // its status word in THIS page's pane header waits for the first write:
    // a pane just opened, which nobody has picked anything in, wears no chip
    // whichever transport it booted on. (The word itself, once a write
    // begins, is testScenePaneOverHttp's.)
    //
    // Read once the annotator has booted far enough to have posted a status
    // (its storage is chosen before it reads anything), so a hidden chip is
    // the answer rather than a message still in flight.
    await page.waitForFunction(() => {
      const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
      return !!w && !!w.AnnotateApp && typeof w.AnnotateApp.exec === "function" &&
        !!w.document.body && w.document.readyState === "complete";
    }, null, { timeout: 15000 }).catch(() => null);
    await page.waitForTimeout(1500);
    const chipShown = await page.evaluate(() => {
      const node = document.querySelector("#flyout-status");
      return !!node && node.style.display !== "none" && node.textContent.trim() !== "";
    });
    const noBand = await page.evaluate(() => {
      const doc = document.querySelector("#annotate-flyout iframe")?.contentDocument;
      const band = doc && doc.querySelector("#banner");
      return !!band && band.offsetParent === null;
    });
    push("a pane just opened wears no status chip in its header until a write " +
      "begins -- and the pane has no banner band of its own",
      !chipShown && noBand);
    // The pane's ONE close control: the chevron on its own divider.
    await page.locator("#flyout-collapse").click();
    push("the divider's chevron closes the flyout",
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

    // A part with no installed mesh offers nothing about 3D: the Preview of
    // its untraced row renders its identity and its gap, minus a way out that
    // would have dead-ended in the annotator's empty state. (The component
    // card's "view this part in 3D" went with the card on 2026-10-30; the
    // open pane follows the selection to the part instead.)
    await page.locator("#flyout-collapse").click();
    // The whole walk, so every row is on screen, and whichever of them wants a
    // binding its part has no model for.
    await pickModel(page, "demo_mechanism");
    await page.waitForSelector("tr.tvrow[data-id='post_bushing_offset']", { timeout: 5000 })
      .catch(() => {});
    await page.waitForTimeout(400);
    const meshless = await page.evaluate(() => {
      const VA = window.ViewerApp;
      const topo = VA.findTopology(VA.demoTopologyFixture().topologies,
        VA.lastTopoRender.topologyId);
      const row = [...document.querySelectorAll("tr.tvrow")].find((tr) => {
        const r = VA.elementRecord(topo, "edge|" + tr.getAttribute("data-id"), {});
        return r && r.binding.wanted && !r.binding.meshed && r.part;
      });
      return row ? row.getAttribute("data-id") : null;
    });
    if (meshless) {
      await page.locator(`tr.tvrow[data-id='${meshless}'] .tvcell--name`).click();
      await page.waitForFunction((key) => {
        const p = document.querySelector(".detail__preview");
        return p && p.getAttribute("data-preview-key") === key;
      }, "edge|" + meshless, { timeout: 5000 }).catch(() => {});
    }
    push("a part with no installed mesh shows NOTHING about 3D in its row's Preview",
      !!meshless && await page.locator(".detail__preview .detail__annotate").count() === 0 &&
      !/3D/.test(await page.locator(".detail__preview .detail__previewbody").textContent()));
    await page.keyboard.press("Escape");

    // --- [real] adjacency against a LIVE study's own drawing ----------------
    //
    // Everything above runs at ?mock=1, whose DAG drawing is ~78px wide. That
    // is enough to catch the panel lying on top of the diagram, but it can
    // never exercise the measurement that decides the clamp: `graphNeed()`
    // read the rails' SVG, and at 78px the floor (VA.FLYOUT_WIDTH.reserve,
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
      // v1's study, so v1 is opened: since 2026-11-08 the default model is
      // studyless v2, and only the open model lists its studies.
      await page.goto(url + "/apps/viewer/topology.html?topology=vpa_pitch_linkage", { waitUntil: "load" });
      await page.waitForSelector('[data-nav-kind="study"]', { timeout: 20000 });
      const liveStudy = "pitch_system_blade_angle_average";
      const liveRow = page.locator(navRow("study", liveStudy));
      if (await liveRow.count() !== 1) {
        push(`[real] SKIPPED -- the live projection has no study ${liveStudy}`, true);
      } else {
        await liveRow.click();
        // The click reaches the paint through a promise; the study's nav row
        // lights in that paint.
        await page.waitForSelector(navRow("study", liveStudy) + ".navtree__row--on",
          { timeout: 10000 }).catch(() => {});
        await page.waitForSelector("#study-3d", { timeout: 20000 });
        const liveRailsBefore = await page.evaluate(() => {
          const r = document.querySelector("#topopane svg.tv__map").getBoundingClientRect();
          return { w: Math.round(r.width), left: Math.round(r.left) };
        });
        // A premise check stood here until 2026-10-26 -- "the live drawing
        // is narrower than the panel's own floor", the reason an OVERLAYING
        // panel covered it whole. The panel is a column of the page's row now
        // (the_shell_seats_the_scene_beside_the_model) and overlays nothing,
        // and its floor dropped to 400, under the widest live drawing; the
        // argument it carried is retired with the layout it was about.
        await page.locator("#study-3d").click();
        await page.waitForSelector("#annotate-flyout[open]", { timeout: 10000 });
        // Waited for on the state, not the clock: the column the panel opens
        // moves the drawing through syncSceneColumn and the map's re-fit, so
        // its rect is read once two consecutive frames agree on it.
        await page.waitForFunction(() => new Promise((resolve) => {
          const rect = () => {
            const r = document.querySelector("#topopane svg.tv__map").getBoundingClientRect();
            const p = document.querySelector("#annotate-flyout").getBoundingClientRect();
            return [r.left, r.width, r.top, p.right].join(",");
          };
          const first = rect();
          requestAnimationFrame(() => requestAnimationFrame(() => resolve(rect() === first)));
        }), null, { timeout: 15000, polling: 100 }).catch(() => {});
        const livePanel = await page.locator("#annotate-flyout").boundingBox();
        const liveRails = await page.evaluate(() => {
          const r = document.querySelector("#topopane svg.tv__map").getBoundingClientRect();
          const p = document.querySelector("#annotate-flyout").getBoundingClientRect();
          // Flush is clear: the two meet on a sub-pixel seam, so within 1px.
          return { w: Math.round(r.width), left: Math.round(r.left), clear: r.left >= p.right - 1 };
        });
        console.log(`      live drawing ${liveRailsBefore.w}px -> ${liveRails.w}px, its left ` +
          `${liveRails.left} against the panel's right ${Math.round(livePanel.x + livePanel.width)}`);
        push("[real] the whole live map is clear of the panel, and still drawn",
          liveRails.w > 0 && liveRails.clear &&
          liveRails.left >= livePanel.x + livePanel.width - 1);
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
          const r = document.querySelector("#topopane svg.tv__map").getBoundingClientRect();
          const p = document.querySelector("#annotate-flyout").getBoundingClientRect();
          return { w: Math.round(r.width), clear: r.width > 0 && r.left >= p.right };
        });
        push("[real] dragged to the clamp on a live study, the whole drawing " +
          "is still clear", liveMaxed.clear);
        await page.locator("#flyout-collapse").click();
        await page.waitForFunction(
          () => !document.body.classList.contains("flyout-open"),
          null, { timeout: 5000 }).catch(() => {});
        await page.evaluate((k) => window.localStorage.removeItem(k),
          await page.evaluate(() => window.ViewerApp.FLYOUT_WIDTH_KEY));
      }
    }

    // --- the trace boot itself, end to end over the annotate mock fixture ---
    await page.goto(url + "/apps/annotate/index.html?embedded=1&mock=1&trace=1" +
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
    push("the notice line narrates the trace in plain words",
      /Traced .*1 part\(s\) ghosted, 1 bound face\(s\) marked/.test(
        await page.locator("#notice-text").textContent()));

    // --- degraded: file:// has no origin to share ----------------------------
    await page.goto(fileBase + "/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });
    await page.locator(navRow("study", "demo_base_to_tip")).click();
    // This beat is for the annotate-mount probe the click starts, which
    // resolves false at once under file:// and re-renders the toolbar when it
    // lands.
    await page.waitForTimeout(300);
    push("under file:// the study offers no 3D affordance at all",
      await page.locator("#study-3d").count() === 0 &&
      await page.locator("#toolbar a").count() === 0);
    await page.locator("tr.tvrow[data-id='arm_pin_to_tip'] .tvcell--name").click();
    await page.waitForSelector("a.detail__annotate-link", { timeout: 5000 });
    push("under file:// the edge pane keeps the annotate-this link",
      await page.locator("a.detail__annotate-link").count() === 1 &&
      await page.locator("button.detail__annotate-btn").count() === 0);

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.closeAllConnections();
    server.close();
  }
}

// The pick rule, measured: aim at one triangle of a part's face on its N-th
// drawn occurrence and pick; then put the part back at its own origin, aim at
// the same triangle there and pick again. The two picks must name the same
// (sha256, face id) -- that pair is all a binding event carries. Every other
// part is hidden for the two raycasts so the measurement is this part's own
// geometry under a rigid move. (Same measurement as
// apps/annotate/run_browser_check.mjs's pickSameFaceBothWays, which no gate
// runs; this copy is the gated one.)
async function pickSameFaceBothWays(page, sha, occurrence, faceId) {
  return page.evaluate(({ sha, occurrence, faceId }) => {
    const scene = window.__scene;
    const mesh = scene.parts.get(sha);
    const others = scene.listOpenParts().filter((s) => s !== sha && scene.isVisible(s));
    others.forEach((s) => scene.setVisible(s, false));
    const savedPos = scene.camera.position.clone();
    const savedQuat = scene.camera.quaternion.clone();
    const placements = scene.drawnPlacements(sha);
    const pos = mesh.geometry.attributes.position.array;
    const idx = mesh.geometry.index.array;
    let tri = -1;
    for (let t = 0; t < mesh.userData.faceIdPerTriangle.length; t++) {
      if (mesh.userData.faceIdPerTriangle[t] === faceId) { tri = t; break; }
    }
    const v = [0, 1, 2].map((k) => {
      const i = idx[tri * 3 + k];
      return mesh.position.clone().set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    });
    const centre = v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1 / 3);
    const normal = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();
    const size = mesh.geometry.boundingBox.getSize(mesh.position.clone());
    const dist = Math.max(size.x, size.y, size.z) + 20;
    const aim = (point, along) => {
      scene.camera.position.copy(point).addScaledVector(along, dist);
      scene.camera.lookAt(point);
      scene.camera.updateMatrixWorld(true);
      return scene.pick(0, 0);
    };
    const m = mesh.matrix.clone().fromArray(placements[occurrence]);
    const placed = aim(centre.clone().applyMatrix4(m), normal.clone().transformDirection(m));
    const rest = placements.map((p) => [p[0], p[4], p[8], p[12], p[1], p[5], p[9], p[13],
      p[2], p[6], p[10], p[14]]);
    scene.setRestPlacements(sha, null);
    const unplaced = aim(centre, normal);
    scene.setRestPlacements(sha, rest);
    others.forEach((s) => scene.setVisible(s, true));
    scene.camera.position.copy(savedPos);
    scene.camera.quaternion.copy(savedQuat);
    const strip = (p) => p && { sha256: p.sha256, faceId: p.faceId, occurrence: p.occurrence };
    return { placed: strip(placed), unplaced: strip(unplaced), drawn: placements.length };
  }, { sha, occurrence, faceId });
}

// --- the 3D pane follows the selection (the_3d_pane_opens_in_the_mode_the_
// study_wants) ---------------------------------------------------------------
//
// The handoff's definition of done, end to end on LIVE data: the viewer
// served beside the annotator off one repo-root origin, non-mock, so the
// kinematic page is the real study and the pane is the real annotator.
//
//   1. The head's 3D control opens the pane on the kinematic study, and the
//      annotator lands in SWEEP mode on the run the study folds -- read back
//      from the annotator itself (its sweep state, its bar's run label) and
//      from the pane's head line, which is the annotator's own reply.
//   2. Selecting a chain study in the nav re-drives the open pane into BIND
//      mode on that study: the sweep is gone and the element list is there.
//   3. A reload reopens the pane, at the width the reader left it.
//   4. Resting on a contributor row tints its bound face in the annotator;
//      resting on a gap row tints nothing.
//
// The annotator cannot be granted a folder from an automated browser (FSA),
// so its frame is booted the way apps/annotate/run_browser_check.mjs's real
// pass boots it: `?mock=1` (added to the FRAME's own URL by an init script,
// before its module reads it -- the viewer is not in mock mode and builds no
// such link) and the memory adapter's reads re-pointed at the served data/.
// Nothing is bound in the live inbox, so the feature-identity projection it
// reads is ONE synthetic binding -- the study's first contributor edge, to
// face 0 of a part the sweep opened -- which is exactly the fact the hover
// check needs and no more: the binding resolution it exercises is the
// annotator's own.
async function realDataIndexForTheAnnotator() {
  const meshes = [];
  const dir = join(DATA_REPO, "data", "meshes");
  if (existsSync(dir)) {
    for (const name of await readdir(dir)) {
      const where = join(dir, name, "provenance.json");
      if (!existsSync(where)) continue;
      const provenance = JSON.parse(await readFile(where, "utf8"));
      meshes.push({ sha256: name, label: provenance.label, part_id: provenance.part_id });
    }
  }
  const runsDir = join(DATA_REPO, "data", "inbox", "linkage-sweeps");
  const runs = existsSync(runsDir)
    ? (await readdir(runsDir)).filter((n) => /\.json$/i.test(n)).map((n) => n.replace(/\.json$/i, ""))
    : [];
  const aliases = JSON.parse(await readFile(
    join(REPO, "docs", "topologies", "part_mesh_aliases.json"), "utf8"));
  return { meshes, runs, aliases };
}

// The annotator, booted on REAL data in a browser with no folder grant: the
// memory adapter's reads pointed at the served `data/`, in whichever frame is
// the annotator's (`page.addInitScript` runs in every frame, so the pane's
// iframe and a standalone page are the same case). `?mock=1` is added to the
// annotator's own URL before its module reads it. `seed.bindings(sweep)`
// does not cross into the page -- the synthetic binding rows are built
// in-page from `seed.binding`: `{topology, edge, faces: [[direction|null,
// faceId], ...]}` on the first part the sweep opened, resolved when read.
// The proposals an edge's only answers accepted, read off the event log, for
// the edges whose record is nothing but that: every binding ratifies one of
// its accepted proposals, nothing rejected, superseded or still open. Keyed
// by edge id, each the proposal events themselves (agent, confidence and
// basis as written). `binding: "real"` with `unaccept` serves such an edge as
// it stood before the accept -- the same proposals, open, and no face -- so a
// check about taking an unanswered end still has one once Jeff has answered
// every end the study lists. Nothing else in the projection is touched.
async function acceptedOnlyProposals() {
  const dir = join(DATA_REPO, "data", "inbox", "feature-identity");
  let projection = null;
  const events = {};
  try {
    projection = JSON.parse(await readFile(
      join(DATA_REPO, "data", "projections", "feature-identity", "bindings.json"), "utf8"));
    for (const name of (await readdir(dir)).filter((n) => /\.json$/i.test(n))) {
      try {
        const e = JSON.parse(await readFile(join(dir, name), "utf8"));
        if (e && e.event_id) events[e.event_id] = e;
      } catch { /* not an event */ }
    }
  } catch {
    return {};
  }
  const out = {};
  for (const r of (projection && projection.stack_keys) || []) {
    const accepted = r.accepted_proposals || [];
    const bindings = r.bindings || [];
    if (r.stack_key.kind !== "topology_edge" || !bindings.length || (r.proposals || []).length ||
        (r.rejected_proposals || []).length || (r.superseded || []).length ||
        !bindings.every((x) => accepted.indexOf(x.ratifies) !== -1) ||
        !accepted.every((id) => events[id])) continue;
    out[r.stack_key.edge_id] = accepted.map((id) => events[id]);
  }
  return out;
}

async function installRealAnnotatorReads(page, seed) {
  await page.addInitScript((seed) => {
    if (location.pathname.indexOf("/apps/annotate/") === -1) return;
    if (!/[?&]mock=1(&|$)/.test(location.search)) {
      history.replaceState(null, "", location.pathname +
        (location.search ? location.search + "&" : "?") + "mock=1" + location.hash);
    }
    const json = (path) => fetch("/data" + path)
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const install = () => {
      const AA = window.AnnotateApp;
      if (!AA || !AA.MemoryAdapter || !AA.orderSweepRuns) return false;
      const P = AA.MemoryAdapter.prototype;
      P.listSweepRuns = async () => AA.orderSweepRuns(await Promise.all(seed.runs.map(
        async (id) => AA.sweepRunEntry(id, await json(`/inbox/linkage-sweeps/${id}.json`)))));
      P.readSweepRun = async (runId) => json(`/inbox/linkage-sweeps/${runId}.json`);
      P.readTopologyProjection = async () => json("/projections/viewer/topologies.json");
      P.readPartNames = async () => json("/projections/parts/names.json");
      P.listMeshes = async () => seed.meshes;
      P.readMeshProvenance = async (sha) => json(`/meshes/${sha}/provenance.json`);
      P.readMeshManifest = async (sha) => json(`/meshes/${sha}/manifest.json`);
      P.readMeshBuffer = async (sha, name) => fetch(`/data/meshes/${sha}/${name}`)
        .then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
      P.readPartMeshAliases = async () => seed.aliases;
      P.readKinematicProjection = async () =>
        json("/projections/viewer/kinematic/kinematic_studies.json");
      // `contact: true`: the contact suggestions on disk whatever the binding
      // -- a joint end's candidate list reads them.
      if (seed.contact) {
        P.readContactSuggestions = async () => json("/projections/feature-identity/contact_suggestions.json");
      }
      // The synthetic binding, resolved when it is read: faces of the first
      // part the sweep placed, so it is a part that is in the scene. Placed,
      // not opened: since 4c0b7c62 the page's `isolate parts` scope loads the
      // whole installed assembly, usually before the sweep reaches its open
      // loop, and a part already open is not one the sweep opened -- so
      // `openedBySweep` (what leaving the sweep unloads) is empty on a real
      // run, and a binding keyed on it named nothing.
      const b = seed.binding;
      // `binding: "real"`: the feature-identity projection and the contact
      // suggestions on disk, as built -- an agent's open proposals included.
      if (b === "real") {
        const unaccept = seed.unaccept || {};
        P.readFeatureIdentityProjection = async () => {
          const doc = await json("/projections/feature-identity/bindings.json");
          (doc && doc.stack_keys || []).forEach((r) => {
            const open = r.stack_key && unaccept[r.stack_key.edge_id];
            if (!open) return;
            Object.assign(r, { state: "proposed", bindings: [], proposals: open, accepted_proposals: [] });
          });
          return doc;
        };
        // The served log, as every real transport gives the pane (since
        // 2026-11-12) and as the shell reads it -- through the same route, so
        // `unaccept` reaches it there. The pane folds it with this session's
        // writes; a projection alone, with its features, has nothing to refold.
        P.readFeatureIdentityLog = async () => json("/projections/viewer/feature-identity/log.json");
        P.readContactSuggestions = async () => json("/projections/feature-identity/contact_suggestions.json");
        return true;
      }
      // `binding: "window"`: whatever the check has put on the frame's own
      // `__truthStackKeys`, read when the projection is read.
      if (b === "window") {
        P.readFeatureIdentityProjection = async () => ({
          get stack_keys() { return window.__truthStackKeys || []; },
        });
        return true;
      }
      P.readFeatureIdentityProjection = async () => ({
        get stack_keys() {
          const sweep = window.__sweep;
          const sha = sweep && sweep.anchored && sweep.anchored[0];
          return sha ? [{
            stack_key: { kind: "topology_edge", topology_id: b.topology, edge_id: b.edge },
            bindings: b.faces.map(([direction, faceId], i) => Object.assign(
              { event_id: "truth-tier-" + i, geometry_key: { source_step_sha256: sha, face_id: faceId } },
              direction ? { direction } : {})),
          }] : [];
        },
      });
      return true;
    };
    const timer = setInterval(() => { if (install()) clearInterval(timer); }, 1);
    document.addEventListener("DOMContentLoaded", () => { install(); clearInterval(timer); });
  }, seed);
  // The shell reads the served LOG and folds it itself (since 2026-11-12,
  // a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown),
  // so `unaccept` is applied there too: the log as it stood before the accept,
  // i.e. without the binding events that ratify those proposals. Otherwise the
  // shell's tree reads those ends bound while the pane reads them open.
  const unaccepted = new Set(Object.values(seed.unaccept || {}).flat().map((p) => p.event_id));
  if (seed.binding === "real" && unaccepted.size) {
    await page.route("**/data/projections/viewer/feature-identity/log.json", async (route) => {
      const response = await route.fetch();
      const doc = response.ok() ? await response.json() : null;
      if (!doc || !Array.isArray(doc.events)) return route.fulfill({ response });
      doc.events = doc.events.filter((e) => !(e && e.ratifies && unaccepted.has(e.ratifies)));
      return route.fulfill({ response, json: doc });
    });
  }
}

// The model drawn in the scene (handoff the_model_is_drawn_in_the_scene), on
// run P2, embedded in the shell exactly as a reader opens it: the kinematic
// study's page, its 3D control, the annotator in the scene column. Every node
// of the merged model anchored, every edge a line, the link lines the stick
// figure's own, the lines riding the sweep, a synthetic binding moving one
// node onto its face -- and the anchors message the shell's leaders will be
// drawn from, observed arriving in the shell's own window.
//
// The frame rate with the layer on and off is PRINTED, never asserted: it is a
// figure about a shared box, and the 4 fps floor it is read against
// (ISSUE_20261014_sweep_modes_frame_rate_figure…) is a headless SwiftShader
// one. Screenshots of two sweep frames and one bind-mode frame are written when
// MODEL_SCENE_SHOTS names a directory.
const MODEL_SCENE_SHOTS = process.env.MODEL_SCENE_SHOTS || null;

async function testAnnotateModelInTheScene(browser, fileBase, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const kinematic = await readProjection("kinematic/kinematic_studies.json");
  const study = kinematic && (kinematic.studies || []).find((s) => s.id === SWEEP_RAIL_STUDY);
  const topology = topologies && (topologies.topologies || [])
    .find((t) => study && t.id === study.topology);
  const index = await realDataIndexForTheAnnotator();
  if (!study || !topology || !(topology.bodies || []).length ||
      index.runs.indexOf(study.sweep.run_id) === -1) {
    push("[real] the model in the scene on P2 (skipped: the run, the kinematic projection or " +
      "a topology projection with bodies is not on disk -- build them, or pass --repo " +
      "<a root built from this tree>)", true);
    return reportSuite(label, checks, errors);
  }
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  // The binding is read off the frame's own window when the projection is
  // read, so the check below can name a face it has just classified.
  await installRealAnnotatorReads(page, { meshes: index.meshes, runs: index.runs,
    aliases: index.aliases, binding: "window" });
  // The shell's own window collects every anchors message, the way the
  // leaders will receive them.
  await page.addInitScript(() => {
    if (location.pathname.indexOf("/apps/viewer/") === -1) return;
    window.__anchorMessages = [];
    window.addEventListener("message", (ev) => {
      if (ev.data && ev.data.type === "annotate:anchors") window.__anchorMessages.push(ev.data);
    });
  });
  // ...and the scene's window collects every model word the shell posts it
  // (this suite's own `exec` calls the app directly, so it adds nothing here).
  await page.addInitScript(() => {
    if (location.pathname.indexOf("/apps/annotate/") === -1) return;
    window.__shellModelWords = [];
    window.addEventListener("message", (ev) => {
      const c = ev.data && ev.data.type === "annotate:exec" ? ev.data.command : null;
      if (Array.isArray(c) && c[0] === "model") window.__shellModelWords.push(c);
    });
  });
  const inPane = (fn, arg) => page.evaluate(({ src, arg }) => {
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    if (!w || !w.document) return null;
    return new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
  }, { src: fn.toString(), arg });
  const until = async (fn, arg, timeout = 60000) => {
    try {
      await page.waitForFunction(({ src, arg }) => {
        const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
        if (!w || !w.document) return false;
        return !!new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
      }, { src: fn.toString(), arg }, { timeout, polling: 100 });
      return true;
    } catch {
      return false;
    }
  };
  const exec = (command) => inPane((w, c) => Promise.resolve(w.AnnotateApp.exec(c)).then(() => true,
    (e) => String(e && e.message || e)), command);
  // The model rebuilt against the current state: built, for this run (or for
  // none), and its anchors drawn.
  const rebuilt = (run) => until((w, r) => w.__model && w.__model.built &&
    w.__model.built.runId === r && (r === null || w.__model.built.bodies) &&
    w.__scene.modelState(), run, 120000);
  const shot = async (name) => {
    if (!MODEL_SCENE_SHOTS) return;
    await page.waitForTimeout(400);
    // The scene's own canvas, out of the pane's frame: the page around it is
    // the shell's, and other suites photograph that.
    await page.frameLocator("#annotate-flyout iframe").locator("#canvas-host")
      .screenshot({ path: join(MODEL_SCENE_SHOTS, name), timeout: 240000 });
  };
  const runId = study.sweep.run_id;

  try {
    await page.goto(url + "/apps/viewer/topology.html?kinematic=" + SWEEP_RAIL_STUDY, { waitUntil: "load" });
    await page.waitForSelector("div.kmverdict", { timeout: 30000 });
    await openPaneByHandle(page);
    // The bodies resolve first, and the model is rebuilt on the occurrences
    // they chose; only then is it the model this suite is about.
    const swept = await until((w, r) => w.__sweep && w.__sweep.artifact.runId === r &&
      w.__sweep.bodies && w.__sweep.bodies.length > 0, runId, 180000);
    const built = swept && await rebuilt(runId);
    push("[real] embedded on P2, the scene builds the model layer by default in sweep mode",
      swept && built);

    // --- 1. every node an anchor, every edge a line -------------------------
    const facts = await inPane((w) => {
      const m = w.__model.built;
      const drawn = w.__scene.modelState();
      const stick = {};
      for (const [name, line] of w.__scene._sweep.links) {
        stick[name] = Array.from(line.geometry.attributes.position.array);
      }
      const anchors = {};
      for (const [id, a] of Object.entries(m.anchors)) {
        anchors[id] = { source: a.source, part: a.part, subject: a.subject, point: a.point,
          rung: a.rung || null, regions: a.section ? m.parts[a.part].section.regions : null,
          boundsX: a.section ? m.parts[a.part].section.bounds[0] : null, why: a.why || null };
      }
      return { anchors, lines: Object.keys(drawn.lines), drawnLines: drawn.lines, stick,
        sources: w.AnnotateApp.MODEL_ANCHOR_SOURCES, dots: drawn.nodes,
        joints: m.joints.groups, hidden: m.hidden, unplaced: m.unplaced,
        unplacedWords: w.__modelUnplaced,
        headLine: (w.document.querySelector(".an__model-unplaced") || {}).textContent || null };
    }) || { anchors: {}, lines: [], drawnLines: {}, stick: {}, sources: [], dots: {}, joints: [],
      hidden: [], unplaced: [], unplacedWords: null, headLine: null };
    const nodeIds = topology.nodes.map((n) => n.id);
    const edgeIds = topology.edges.map((e) => e.id);
    // What the scene must draw, worked from the projection's own topology:
    // an edge is drawn unless an end is unplaced or both ends are one joint.
    const jointOf = {};
    for (const g of facts.joints) for (const id of g.members) jointOf[id] = g.id;
    const unplacedSet = new Set(facts.unplaced);
    const wantLines = edgeIds.filter((id) => {
      const e = topology.edges.find((x) => x.id === id);
      if (unplacedSet.has(e.from) || unplacedSet.has(e.to)) return false;
      return !(jointOf[e.from] && jointOf[e.from] === jointOf[e.to]);
    });
    push("[real] every node of the merged model has an anchor, and every edge is a line except " +
      "one inside a joint or one touching an unplaced node",
      nodeIds.every((id) => facts.anchors[id]) && Object.keys(facts.anchors).length === nodeIds.length &&
      facts.lines.slice().sort().join() === wantLines.slice().sort().join() &&
      facts.hidden.every((id) => facts.lines.indexOf(id) === -1));

    // --- 1b. a joint is one node (coaxial_ends_share_one_3d_node) ------------
    // The solver's plate slide makes the two spindle bores one joint; the
    // link centres stay apart; nothing is drawn at the assembly origin.
    const spindle = facts.joints.find((g) => g.members.indexOf("hub_spindle_bore_axis") !== -1);
    console.log(`      [${label}] joints: ` + facts.joints.map((g) => g.members.join(" + ")).join("; ") +
      `; hidden inside them: ${facts.hidden.join(", ") || "-"}; unplaced: ${facts.unplaced.length}`);
    push("[real] the spindle coaxiality pair is ONE dot in the scene, with no line between its ends",
      spindle && spindle.members.join() === "hub_spindle_bore_axis,pitch_plate_spindle_bore_axis" &&
      facts.dots[spindle.id] && facts.dots[spindle.id].members.join() === spindle.members.join() &&
      !facts.dots.pitch_plate_spindle_bore_axis &&
      facts.hidden.indexOf("hub_to_pitch_plate_spindle_coaxiality") !== -1);
    const lower = facts.dots.pitch_link_lower_sphere_centre, upper = facts.dots.pitch_link_upper_sphere_centre;
    push("[real] the pitch link's two centres stay two dots, a link length apart",
      lower && upper && Math.hypot(lower.at[0] - upper.at[0], lower.at[1] - upper.at[1],
        lower.at[2] - upper.at[2]) > 50);
    const atOrigin = Object.entries(facts.dots).filter(([id, d]) => d.visible && id !== (spindle && spindle.id) &&
      Math.hypot(d.at[0], d.at[1], d.at[2]) < 1e-6).map(([id]) => id);
    push("[real] no unplaced node is drawn: no dot for one, none at the assembly origin, and the head " +
      "line counts them",
      facts.unplaced.length > 0 && facts.unplaced.every((id) => !facts.dots[id]) && atOrigin.length === 0 &&
      facts.headLine === facts.unplaced.length + " nodes not placed" &&
      facts.unplacedWords && facts.unplacedWords.title.split("; ").length === facts.unplaced.length);
    const bySource = {};
    for (const [id, a] of Object.entries(facts.anchors)) (bySource[a.source] = bySource[a.source] || []).push(id);
    console.log(`      [${label}] anchors by source: ` + Object.keys(bySource).map((s) =>
      `${s} ${bySource[s].length}`).join(", ") + "; no geometry: " +
      (bySource.origin || []).map((id) => `${id} (${facts.anchors[id].why})`).join(", "));
    push("[real] with no binding in the inbox, no anchor is a bound face's: every one is a " +
      "joint point, a section or a body origin",
      !bySource.bound && Object.keys(bySource).every((s) => facts.sources.indexOf(s) !== -1) &&
      (bySource.section || []).length > 0);

    // The hub's internals: one upright on its +X side, rungs in stack order.
    const hub = Object.entries(facts.anchors).filter(([, a]) => a.part === "hub" &&
      a.source === "section").map(([id, a]) => ({ id, ...a }))
      .sort((a, b) => (a.rung ? a.rung[0] : 0) - (b.rung ? b.rung[0] : 0));
    console.log(`      [${label}] hub ladder at x=${hub.length ? hub[0].point[0].toFixed(1) : "-"}: ` +
      hub.map((h) => `${h.id}@z${h.point[2].toFixed(1)}`).join(", "));
    push("[real] the hub's internals sit on the hub's +X side as a ladder, rung over rung in " +
      "stack order",
      hub.length >= 3 && hub.every((h) => h.point[0] === hub[0].point[0] &&
        h.point[1] === hub[0].point[1] && h.rung && h.rung[1] === hub.length) &&
      hub[0].point[0] > (hub[0].boundsX[0] + hub[0].boundsX[1]) / 2 &&
      hub.every((h, i) => i === 0 || h.point[2] > hub[i - 1].point[2]));

    // The tangential-link mount is a ring round the spindle: its cut is two
    // walls, and the bore's anchor is on the +X one.
    const mount = facts.anchors.tan_link_mount_bore;
    const ringCentre = mount && mount.boundsX ? (mount.boundsX[0] + mount.boundsX[1]) / 2 : null;
    console.log(`      [${label}] tan-link mount: ${mount && mount.regions} regions across ` +
      `x ${mount && mount.boundsX ? mount.boundsX.map((v) => v.toFixed(1)).join("..") : "-"}; ` +
      `bore anchored at x=${mount && mount.point ? mount.point[0].toFixed(1) : "-"}`);
    push("[real] the tan-link mount's bore anchors on its +X intersection, not at the ring's centre",
      mount && mount.source === "section" && mount.regions >= 2 &&
      mount.point[0] > ringCentre + 10);

    // The two links: the model's lines ARE the stick figure's, the same two
    // float32 points (a line's end order is from -> to, the stick's a -> b).
    const sameTwo = (line, stick) => {
      if (!line || !stick) return false;
      const a = line.raw.slice(0, 3), b = line.raw.slice(3, 6);
      const s0 = stick.slice(0, 3), s1 = stick.slice(3, 6);
      const eq = (p, q) => p.every((v, i) => Object.is(v, q[i]));
      return (eq(a, s0) && eq(b, s1)) || (eq(a, s1) && eq(b, s0));
    };
    push("[real] the pitch link and tan link lines are the stick figure's own two points, bit for bit",
      sameTwo(facts.drawnLines.pitch_link_length, facts.stick.pitch_link) &&
      sameTwo(facts.drawnLines.tan_link_length, facts.stick.tan_link));

    // --- 2. the anchors message, in the shell's own window ------------------
    const shellSide = await page.evaluate(() => {
      const list = window.__anchorMessages || [];
      const last = list[list.length - 1] || null;
      const frame = document.querySelector("#annotate-flyout iframe").getBoundingClientRect();
      return { count: list.length, last, w: frame.width, h: frame.height };
    });
    // The same node projected here, independently: its dot's world point
    // through the camera, plus the canvas's offset inside the frame -- the
    // canvas sits under the annotator's bars, so a message in canvas pixels
    // would be off by exactly that offset.
    const projected = await inPane((w) => {
      const s = w.__scene;
      const dot = s._model.dots.get("tan_link_mount_bore");
      const v = dot.getWorldPosition(new s.camera.position.constructor()).project(s.camera);
      const r = s.renderer.domElement.getBoundingClientRect();
      return { at: [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height], top: r.top,
        sent: w.__lastAnchors.nodes.tan_link_mount_bore };
    });
    const onScreen = shellSide.last ? Object.values(shellSide.last.nodes).filter(Boolean) : [];
    console.log(`      [${label}] anchors messages seen by the shell: ${shellSide.count}; the last ` +
      `places ${onScreen.length} of ${shellSide.last ? Object.keys(shellSide.last.nodes).length : 0} ` +
      `nodes and ${shellSide.last ? Object.keys(shellSide.last.edges).length : 0} edges`);
    push("[real] the shell receives annotate:anchors with every node, the on-screen ones in the " +
      "iframe's own CSS pixels",
      shellSide.last && Object.keys(shellSide.last.nodes).length === nodeIds.length &&
      onScreen.length > 0 && onScreen.every(([x, y]) => x >= 0 && y >= 0 &&
        x <= shellSide.w + 1 && y <= shellSide.h + 1) &&
      (bySource.origin || []).every((id) => shellSide.last.nodes[id] === null) &&
      // A joint's members are one point: the shell's leaders fan in to it.
      (!spindle || spindle.members.every((id) => JSON.stringify(shellSide.last.nodes[id]) ===
        JSON.stringify(shellSide.last.nodes[spindle.id]))) &&
      projected && projected.top > 0 && projected.sent &&
      Math.abs(projected.sent[0] - projected.at[0]) <= 0.1 &&
      Math.abs(projected.sent[1] - projected.at[1]) <= 0.1);
    const before = shellSide.count;
    await inPane((w) => { w.__scene.camera.position.multiplyScalar(1.15); w.__scene.controls.update(); });
    const moved = await page.waitForFunction((n) => (window.__anchorMessages || []).length > n,
      before, { timeout: 15000 }).then(() => true, () => false);
    push("[real] a camera move posts the anchors again", moved);

    // --- 2b. an anchor under the real pointer previews its node in the shell
    // (a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_
    // mark): the scene's own raycast against its dots, its own post, and the
    // shell's Preview -- end to end, on real geometry.
    await page.waitForTimeout(400);
    const aim = await page.evaluate(() => {
      const list = window.__anchorMessages || [];
      const last = list[list.length - 1];
      const iframe = document.querySelector("#annotate-flyout iframe");
      const f = iframe.getBoundingClientRect();
      const ids = last ? Object.keys(last.nodes).filter((id) => {
        const p = last.nodes[id];
        return p && p[0] > 40 && p[1] > 60 && p[0] < f.width - 40 && p[1] < f.height - 40;
      }) : [];
      if (!ids.length) return null;
      const p = last.nodes[ids[0]];
      return { id: ids[0], x: f.left + iframe.clientLeft + p[0], y: f.top + iframe.clientTop + p[1],
        away: { x: f.left + iframe.clientLeft + 8, y: f.bottom - 8 } };
    });
    let hovered = null;
    if (aim) {
      await page.mouse.move(aim.x - 3, aim.y - 3);
      await page.mouse.move(aim.x, aim.y);
      hovered = await page.waitForFunction(() => {
        const w = document.querySelector("#annotate-flyout iframe").contentWindow;
        const m = w.__shellMessages && w.__shellMessages["annotate:hover"];
        const p = document.querySelector(".detail__preview");
        return m && m.id && p && p.getAttribute("data-preview-key") === "node|" + m.id ? m.id : null;
      }, null, { timeout: 10000 }).then((h) => h.jsonValue(), () => null);
    }
    push("[real] the scene's pointer on an anchor previews that node in the shell's Preview",
      !!aim && !!hovered);
    if (aim) {
      await page.mouse.move(aim.away.x, aim.away.y);
      await page.mouse.move(aim.away.x + 2, aim.away.y - 2);
    }
    push("[real] ...and off every anchor the scene says so, and the Preview lets it go",
      !!aim && await page.waitForFunction(() => {
        const w = document.querySelector("#annotate-flyout iframe").contentWindow;
        const m = w.__shellMessages && w.__shellMessages["annotate:hover"];
        const p = document.querySelector(".detail__preview");
        return m && m.id === null && p && p.getAttribute("data-preview-state") !== "hover";
      }, null, { timeout: 10000 }).then(() => true, () => false));

    // --- 3. the lines ride the sweep ----------------------------------------
    await exec(["seek", "#0"]);
    const ride = await inPane((w) => {
      const AA = w.AnnotateApp;
      const m = w.__model.built;
      const frame = w.__sweep.frame;
      const drawn = w.__scene.modelState();
      const edge = (id) => {
        const line = drawn.lines[id];
        const e = (m.lines[id]);
        const a = m.anchors[e.from], b = m.anchors[e.to];
        const pose = AA.modelSubjectPlacement(frame, a.subject);
        return { inBody: line.inBody, subject: a.subject, ends: line.ends,
          want: [AA.applyPlacement(pose, a.point), AA.applyPlacement(pose, b.point)],
          home: [a.point, b.point] };
      };
      const gap = drawn.lines.pitch_arm_link_joint;
      // A pitch-plate structural line that touches no joint: the spindle's
      // own lines are world lines now (coaxial_ends_share_one_3d_node).
      return { plate: edge("washer_nas1149v0332"), arm: edge("pitch_arm_radius"),
        gap: { ends: gap.ends, from: drawn.nodes.pitch_arm_link_bore.at,
          to: drawn.nodes.pitch_link_lower_sphere_centre.at } };
    });
    const near = (p, q, tol) => p && q && p.every((v, i) => Math.abs(v - q[i]) <= tol);
    const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    push("[real] a structural line rides its body: drawn in the body's frame, carried by its pose " +
      "away from where it was modelled",
      ride && ["plate", "arm"].every((k) => ride[k].inBody &&
        near(ride[k].ends[0], ride[k].want[0], 1e-3) && near(ride[k].ends[1], ride[k].want[1], 1e-3) &&
        dist(ride[k].ends[0], ride[k].home[0]) > 0.5));
    push("[real] a joint line runs between the two bodies' anchors, recomputed at the frame",
      ride && near(ride.gap.ends[0], ride.gap.from, 1e-3) && near(ride.gap.ends[1], ride.gap.to, 1e-3));
    await shot("1_sweep_frame_1.png");
    await exec(["seek", "#40"]);
    await shot("2_sweep_frame_41.png");
    // ...and the as-modelled frame, where the spindle joint sits at the
    // assembly origin (coaxial_ends_share_one_3d_node's before/after pair).
    if (MODEL_SCENE_SHOTS) {
      const asModelled = await inPane((w) => w.AnnotateApp.sweepAsModelledIndex(w.__sweep.artifact));
      if (asModelled !== null) {
        await exec(["seek", "#" + asModelled]);
        await shot("5_as_modelled.png");
        await exec(["seek", "#0"]);
      }
    }

    // --- 4. the lit set, and the shell's dim-or-hide word -------------------
    // Embedded, the shell speaks first: it posts its own lit set when the
    // scene loads (leaders_follow_the_active_study_across_the_seam), and the
    // scene draws exactly that set at full strength.
    const shellLit = await until((w) => {
      const words = w.__shellModelWords || [];
      const said = words.filter((c) => c[1] === "lit").pop();
      const strengths = w.__model && w.__model.strengths;
      if (!said || said[2] === "all" || !strengths) return false;
      const want = said.slice(2).filter((id) => strengths[id] !== undefined).sort();
      const full = Object.keys(strengths).filter((k) => strengths[k] === "full").sort();
      return want.length > 0 && full.join() === want.join() &&
        Object.keys(strengths).some((k) => strengths[k] !== "full");
    }, null, 30000);
    const saidLit = await inPane((w) => {
      const said = (w.__shellModelWords || []).filter((c) => c[1] === "lit").pop();
      return said ? said.slice(2) : null;
    });
    console.log(`      [${label}] the shell's lit set: ${saidLit ? saidLit.length : "-"} edges`);
    push("[real] embedded on the kinematic page, the scene draws the shell's posted lit set at full " +
      "strength and the rest stepped back", shellLit);
    // What the scene does where no shell has spoken is the scene's own
    // fallback: the shell's word is taken back (the scene forgets it, as a
    // standalone annotator never had one) and the style re-applied by the
    // verb that re-reads it, so the fallback is read in this same embedded pane.
    await inPane((w) => { delete w.__model.lit; return true; });
    await exec(["model", "unlit", "dim"]);
    const lit = await inPane((w) => {
      const s = w.__scene.modelState();
      const strengths = w.__model.strengths;
      const full = Object.keys(strengths).filter((k) => strengths[k] === "full");
      // Read defensively: with nothing dimmed (or nothing full) this is a
      // failed check, never a thrown one that aborts the suite unnamed.
      const dim = Object.keys(strengths).find((k) => strengths[k] === "dim");
      return { full, dimOpacity: dim ? s.lines[dim].opacity : null,
        fullOpacity: full.length ? s.lines[full[0]].opacity : null };
    });
    const contributors = new Set();
    for (const stop of study.stops) for (const row of stop.rows) contributors.add(row.edge);
    push("[real] until the shell posts a lit set, the open study's contributors are drawn at full " +
      "strength and the rest dimmed",
      lit && lit.full.length === contributors.size && lit.full.every((id) => contributors.has(id)) &&
      lit.fullOpacity === 1 && lit.dimOpacity !== null && lit.dimOpacity < 1);
    await exec(["model", "unlit", "hide"]);
    const hidden = await inPane((w) => {
      const s = w.__scene.modelState();
      return Object.keys(s.lines).filter((k) => s.lines[k].visible).sort();
    });
    await exec(["model", "lit", "pitch_link_length"]);
    const posted = await inPane((w) => {
      const s = w.__scene.modelState();
      return Object.keys(s.lines).filter((k) => s.lines[k].visible);
    });
    push("[real] the shell's word rules the rest: hide leaves only the lit lines, and a posted lit " +
      "set replaces the study's",
      hidden && hidden.join() === Array.from(contributors).sort().join() &&
      posted && posted.join() === "pitch_link_length");
    await exec(["model", "unlit", "dim"]);
    await exec(["model", "lit", "all"]);

    // --- 4b. each part in its body's DAG ink ----------------------------------
    // The shell posts `model tint` with every body part's ink, read off its own
    // `--tv-body-ink-*` (the_dag_is_coloured_by_a_chosen_attribute_and_spaced_
    // _to_taste, review round 1), and the scene paints it: the parts of one
    // body share a base colour that is not their own, and two bodies differ.
    const wantTint = await page.evaluate((topo) => {
      const VA = window.ViewerApp;
      const css = getComputedStyle(document.documentElement);
      return VA.sceneTintCommand(topo, (n) => css.getPropertyValue("--tv-body-ink-" + n).trim());
    }, topology);
    const tinted = await until((w, want) => {
      const said = (w.__shellModelWords || []).filter((c) => c[1] === "tint").pop();
      return said && said.join() === want.join() && w.__scene._partTints &&
        w.__scene._partTints.size > 0;
    }, wantTint, 30000);
    const paint = await inPane((w) => {
      const out = [];
      for (const [sha, hex] of w.__scene._partTints || []) {
        const mesh = w.__scene.parts.get(sha);
        if (!mesh) continue;
        out.push({ hex, base: w.__scene.partBaseColor(sha),
          own: "#" + mesh.userData.paletteColor.toString(16).padStart(6, "0") });
      }
      return out;
    }) || [];
    const baseOf = {};
    for (const p of paint) (baseOf[p.hex] = baseOf[p.hex] || new Set()).add(p.base);
    const inks = Object.keys(baseOf);
    const bases = inks.map((h) => Array.from(baseOf[h])[0]);
    const saidInks = new Set(wantTint.slice(2).map((pair) => pair.split("=")[1]));
    console.log(`      [${label}] tinted parts in the scene: ${paint.length}, bodies ${inks.length}`);
    push("[real] embedded on the kinematic page, the shell posts each body part's DAG ink and " +
      "the scene draws a body's parts in one colour that is not their own",
      tinted && wantTint[2] !== "off" && paint.length > 0 &&
      paint.every((p) => p.base !== p.own && saidInks.has(p.hex)) &&
      inks.every((h) => baseOf[h].size === 1) && new Set(bases).size === inks.length);

    // --- 5. selection shows why -----------------------------------------------
    await exec(["model", "select", "node", "tan_link_mount_bore"]);
    await shot("4_selected_tan_link_mount_bore.png");
    const nodeSel = await inPane((w) => ({ sel: w.__scene.modelState().selection,
      said: w.__lastModelSelection }));
    await exec(["model", "select", "body", "base"]);
    const bodySel = await inPane((w) => w.__scene.modelState().selection);
    push("[real] a selected node shows the plane and the cut its anchor came from; a selected body " +
      "names itself at its +X anchor",
      nodeSel && nodeSel.sel && nodeSel.sel.plane && nodeSel.sel.region &&
      /section/.test(nodeSel.said.words) &&
      bodySel && bodySel.plane && bodySel.label === (topology.bodies.find((b) => b.id === "base").name));
    await exec(["model", "select", "clear"]);

    // --- 6. a binding moves its node onto its face ----------------------------
    // The pitch plate's first round face, classified here the way the app
    // classifies it, bound at the link-attach bore end of the attach radius.
    const expected = await inPane(async (w) => {
      const AA = w.AnnotateApp;
      const part = w.__model.built.parts.pitch_plate_215177_001;
      const base = "/data/meshes/" + part.sha256 + "/";
      const manifest = await (await fetch(base + "manifest.json")).json();
      const buf = async (name) => (await fetch(base + name)).arrayBuffer();
      const classes = AA.classifyPartFaces(manifest.faces, new Float32Array(await buf(manifest.positions_file)),
        new Uint32Array(await buf(manifest.indices_file)), new Uint32Array(await buf(manifest.face_ids_file)));
      const face = classes.find((c) => c && c.surface === "cylindrical");
      w.__truthStackKeys = [{
        stack_key: { kind: "topology_edge", topology_id: "vpa_pitch_linkage", edge_id: "pitch_plate_attach_radius" },
        bindings: [{ event_id: "truth-model-1", direction: "to",
          geometry_key: { source_step_sha256: part.sha256, face_id: face.faceId } }],
      }];
      return { point: AA.applyPlacement(part.placement, face.axisPoint),
        was: w.__model.built.anchors.pitch_plate_link_attach_bore.point };
    });
    await exec(["layer", "model", "off"]);
    await exec(["layer", "model", "on"]);
    await rebuilt(runId);
    const bound = await inPane((w) => {
      const a = w.__model.built.anchors.pitch_plate_link_attach_bore;
      return { source: a.source, point: a.point,
        others: Object.values(w.__model.built.anchors).filter((x) => x.source === "bound").length };
    });
    push("[real] a synthetic binding moves exactly one node to its bound face's fitted point",
      expected && bound && bound.source === "bound" && bound.others === 1 &&
      near(bound.point, expected.point, 1e-9) && dist(bound.point, expected.was) > 0.1);
    await inPane((w) => { w.__truthStackKeys = []; });

    // --- 7. the frame rate, printed ------------------------------------------
    const fps = async (on) => {
      await exec(["layer", "model", on ? "on" : "off"]);
      if (on) await rebuilt(runId);
      await exec(["play"]);
      await page.waitForTimeout(4000);
      const f = await inPane((w) => ({ fps: w.__sweep.fps, renders: w.__scene.renderCount }));
      await exec(["pause"]);
      return f ? f.fps : null;
    };
    const withModel = await fps(true);
    const without = await fps(false);
    const again = await fps(true);
    console.log(`      [${label}] playing P2 headless: ${withModel && withModel.toFixed(1)} drawn fps with ` +
      `the model, ${without && without.toFixed(1)} without, ${again && again.toFixed(1)} with it again`);

    // --- 8. bind mode, at the as-modelled pose --------------------------------
    await exec(["sweep", "off"]);
    await exec(["layer", "model", "on"]);
    const bindBuilt = await rebuilt(null);
    const bind = bindBuilt ? await inPane((w) => {
      const anchors = Object.values(w.__model.built.anchors);
      return { n: anchors.length, joint: anchors.filter((a) => a.source === "joint").length,
        lines: Object.keys(w.__scene.modelState().lines).length };
    }) : null;
    push("[real] bind mode draws the whole model at the as-modelled pose, with no solver joint " +
      "points to read (so no solver joint to merge on, and no binding in the inbox to merge on either)",
      bind && bind.n === nodeIds.length && bind.joint === 0 &&
      bind.lines === edgeIds.filter((id) => {
        const e = topology.edges.find((x) => x.id === id);
        return !unplacedSet.has(e.from) && !unplacedSet.has(e.to);
      }).length);
    // The picture wants the parts the model is drawn on: bind mode opens none
    // by itself, so the study's own are shown and framed first.
    if (MODEL_SCENE_SHOTS) {
      await exec(["show-all"]);
      await exec(["camera", "frame", "hub"]);
    }
    await shot("3_bind_mode.png");
  } catch (err) {
    errors.push(String(err && err.stack || err));
  } finally {
    await page.close();
    server.close();
  }
  return reportSuite(label, checks, errors);
}

// Screenshots of the scene column (the_shell_seats_the_scene_beside_the_
// model), taken by the suite below when SHELL_SCENE_SHOTS names a directory.
const SHELL_SCENE_SHOTS = process.env.SHELL_SCENE_SHOTS || null;

async function testThreeDPane(browser, fileBase, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const kinematic = await readProjection("kinematic/kinematic_studies.json");
  const STUDY = "vpa_pitch_linkage_blade_pitch_at_the_stops";
  const CHAIN = "vpa_pitch_linkage_travel_between_end_stops";
  const study = kinematic && (kinematic.studies || []).find((s) => s.id === STUDY);
  const topology = topologies && (topologies.topologies || [])
    .find((t) => study && t.id === study.topology);
  const rows = study ? study.stops[0].rows : [];
  // The page reads the served feature-identity LOG (since 2026-11-12), so the
  // row whose hover must overlay a face is one bound THERE -- not the pane's
  // synthetic binding below, which the page never sees. The first study row
  // with a standing binding under the study's topology, else the first
  // non-gap row (the synthetic binding's own, for the checks that read the pane).
  const servedLog = await readProjection("feature-identity/log.json");
  const boundInLog = (edge) => !!(servedLog && (servedLog.events || []).some((e) => e && e.verdict === "bound" &&
    e.stack_key && e.stack_key.edge_id === edge && e.stack_key.topology_id === (study && study.topology)));
  const bound = rows.find((r) => r.kind !== "gap");
  const boundRow = rows.find((r) => r.kind !== "gap" && boundInLog(r.edge)) || bound;
  // A row with no binding: any contributor but the bound one (the seeded
  // binding is the only one). It was "a gap row" until the live study's last
  // gap was banded (the_tangential_link_cites_its_drawing), after which this
  // suite skipped itself -- as "the projections are not built" -- on every
  // real run, unnoticed.
  const unbound = rows.find((r) => bound && r.edge !== bound.edge);

  // file://, first: no annotator can be embedded there, so the 3D control is
  // not on the page at all -- the absent-feature rule, not a disabled button.
  const filePage = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  try {
    await filePage.goto(fileBase + "/topology.html?mock=1", { waitUntil: "load" });
    await filePage.waitForSelector("tr.tvrow", { timeout: 15000 });
    push("under file:// the seam shows no 3D handle -- nothing about a pane " +
      "this page cannot open",
      await filePage.locator("#pane-handle").count() === 1 &&
      !(await filePage.locator("#pane-handle").isVisible()));
  } catch (err) {
    errors.push(String(err));
  } finally {
    await filePage.close();
  }

  if (!study || !topology || !bound || !unbound ||
      !(topology.studies || []).some((s) => s.id === CHAIN)) {
    push("[real] the 3D pane on a live kinematic study (skipped: the kinematic " +
      "and topology projections are not built -- build them, or pass --repo " +
      "<main checkout>)", true);
    return reportSuite(label, checks, errors);
  }

  const index = await realDataIndexForTheAnnotator();
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  // Runs in every frame the page attaches, before its own scripts; only the
  // annotator's frame does anything with it.
  await installRealAnnotatorReads(page, { meshes: index.meshes, runs: index.runs,
    aliases: index.aliases,
    binding: { topology: study.topology, edge: bound.edge, faces: [[null, 0]] } });

  // Read off the annotator's frame; null until it exists.
  const inPane = (fn, arg) => page.evaluate(({ src, arg }) => {
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    if (!w || !w.document) return null;
    return new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
  }, { src: fn.toString(), arg });
  // Waits are swallowed and reported as a named check's failure, never thrown:
  // a suite that dies on a timeout prints no check name, and its witness reads
  // as a MISS (scripts/mutation_witnesses/README.md).
  const until = async (fn, arg, timeout = 60000) => {
    try {
      await page.waitForFunction(({ src, arg }) => {
        const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
        if (!w || !w.document) return false;
        return !!new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
      }, { src: fn.toString(), arg }, { timeout, polling: 100 });
      return true;
    } catch {
      return false;
    }
  };
  const headLine = () => page.locator("#flyout-title").textContent();
  const storedKeys = () => page.evaluate(() => [
    window.ViewerApp.FLYOUT_WIDTH_KEY, window.ViewerApp.FLYOUT_OPEN_KEY]);

  try {
    await page.goto(url + "/apps/viewer/topology.html?kinematic=" + STUDY, { waitUntil: "load" });
    await page.waitForSelector("div.kmverdict", { timeout: 30000 });
    await page.waitForSelector("#pane-handle:visible", { timeout: 15000 }).catch(() => {});
    push("[real] served beside the annotator, the seam shows the 3D handle",
      await page.locator("#pane-handle").isVisible());

    // --- 1. open on the kinematic study -> sweep mode on its run ------------
    await page.locator("#pane-handle").click({ timeout: 5000 }).catch(() => {});
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 5000 }).catch(() => {});
    const src = await page.locator("#annotate-flyout iframe").getAttribute("src").catch(() => null);
    push("[real] the seam's handle opens the pane, booted on the study's run -- " +
      "the same link the kinematic study's selection asks for",
      await page.locator("#annotate-flyout").evaluate((n) => n.open) &&
      src === "../annotate/index.html?sweep=" + encodeURIComponent(study.sweep.run_id) +
        "&kinematic=" + encodeURIComponent(STUDY) + "&embedded=1");
    const swept = await until((w, run) => w.__sweep && w.__sweep.artifact &&
      w.__sweep.artifact.runId === run && w.document.querySelector("#sweep-tip") &&
      w.document.querySelector(".an__sweep-summary"), study.sweep.run_id);
    // The bar's run label: the run picker's chosen option where there is more
    // than one run to choose from (the picker then names the mechanism, and
    // the summary line does not say it twice), the summary line otherwise.
    const summary = swept ? await inPane((w) => {
      const picker = w.document.querySelector('select.an__sweep-select[aria-label="which run"]');
      return picker ? picker.options[picker.selectedIndex].textContent
        : w.document.querySelector(".an__sweep-summary").textContent;
    }) : "";
    const mechanism = swept
      ? await inPane((w) => w.AnnotateApp.measureLabel(w.__sweep.artifact.mechanismName)) : null;
    push("[real] the annotator is in sweep mode on the study's run, and its bar " +
      "names the run's mechanism",
      swept && mechanism && summary.indexOf(mechanism) !== -1);
    // The study rode in with the run (handoff the_sweep_rail_shows_the_
    // mechanism), so the pane's rail lists its contributors at the stop the
    // frame is nearest.
    const listed = swept && await until((w, n) => w.document.querySelectorAll(
      '#sweep-tree [data-group="contributors"] .tree-row').length === n,
      study.stops[0].rows.length, 15000);
    push("[real] ...and the pane's rail lists the kinematic study's contributors, " +
      "which the viewer passed with the run", listed);
    await page.waitForFunction(() => /^Sweep/.test(
      document.querySelector("#flyout-title").textContent), null, { timeout: 15000 }).catch(() => {});
    push("[real] the pane's head line is the annotator's own answer: the mode " +
      "and the run's mechanism, one line",
      (await headLine()) === "Sweep — " + mechanism);

    // --- the shell seats the scene beside the model (2026-10-26) -----------
    // nav | scene | DAG + grid | results, left to right (the results pane
    // stays beside the grid since 2026-10-28), and the annotator's own rail
    // drawn in the nav under the study row.
    const layout = await page.evaluate(() => {
      const box = (sel) => {
        const n = document.querySelector(sel);
        if (!n) return null;
        const r = n.getBoundingClientRect();
        return { x: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) };
      };
      return { nav: box("#navtree"), scene: box("#annotate-flyout"),
        dag: box("#topopane svg.tv__map"), pane: box("#topopane"), grid: box(".tv__main"),
        detail: box("#detail"), chart: box("#detail figure.kmchart"),
        shown: getComputedStyle(document.querySelector("#detail")).display };
    });
    push("[real] the kinematic page reads tree | scene | DAG | grid and results, left to " +
      "right, the chart in the results pane under the grid",
      layout.nav && layout.scene && layout.dag && layout.detail && layout.chart &&
      layout.nav.x <= 1 && Math.abs(layout.scene.x - layout.nav.right) <= 4 &&
      layout.dag.x >= layout.scene.right - 1 && layout.shown !== "none" &&
      layout.grid.x >= layout.pane.right - 8 && layout.detail.x >= layout.grid.x - 1 &&
      layout.chart.w > 0);
    const embedded = await inPane((w) => {
      const rail = w.document.querySelector(".an__rail");
      const host = w.document.querySelector("#canvas-host").getBoundingClientRect();
      return {
        rail: w.getComputedStyle(rail).visibility,
        console: w.document.querySelector(".an__console") ? "present" : "none",
        canvas: Math.round(host.width), page: w.innerWidth,
      };
    });
    push("[real] embedded, the annotator shows neither its rail nor its command " +
      "box, and its canvas takes the whole column",
      embedded && embedded.rail === "hidden" && embedded.console === "none" &&
      embedded.canvas >= embedded.page - 2);

    // --- the left column is the model's tree (2026-11-10) -------------------
    // With the pane open the nav is still the model's: one row per body, the
    // study's own row marked, and no rail mirrored under it until a feature
    // is selected.
    const modelBodies = (topology.model && topology.model.bodies || []).length;
    await page.waitForFunction((n) => document.querySelectorAll(
      '#navtree [data-nav-kind="body"]').length === n, modelBodies, { timeout: 15000 }).catch(() => {});
    const treeShape = await page.evaluate(() => ({
      bodies: document.querySelectorAll('#navtree [data-nav-kind="body"]').length,
      studyOn: document.querySelectorAll('#navtree [data-nav-kind="kinematic"].navtree__row--on').length,
      mirrored: document.querySelectorAll("#navtree .navtree__scene").length,
      chips: document.querySelectorAll("#navtree .navtree__scenechip").length,
      picker: document.querySelector("#navtree select.navtree__select").value,
    }));
    push("[real] with the pane open the left column is the model's tree: one row per body, " +
      "the study's row marked, the picker on the model, and no rail mirrored under it",
      treeShape.bodies === modelBodies && modelBodies > 0 && treeShape.studyOn === 1 &&
      treeShape.mirrored === 0 && treeShape.chips === 0 &&
      treeShape.picker === "topology:" + topology.id);
    if (SHELL_SCENE_SHOTS) {
      await page.screenshot({ path: join(SHELL_SCENE_SHOTS, "1600_kinematic.png") });
    }

    // Hover from the nav lights the body in the scene; leaving lets it go. A
    // body row is posted only when the run's own tree names it as a subject,
    // so the body is one the sweep tree lists.
    await inPane((w) => w.AnnotateApp.exec(["pause"]));
    await page.waitForTimeout(500);
    const bodyName = await inPane((w) => w.__sweep.tree.bodies[0].name);
    const bodyRowSel = `#navtree [data-nav-kind="body"][data-nav-id="${bodyName}"]`;
    // Held, not sampled: the pane's rail rebuilds for seconds after the run
    // loads (its bodies anchoring), and a rebuild clears the hover on its own.
    // The tree's row is not rebuilt with it, so the pointer has to LEAVE the
    // row and come back for a new `mouseenter` -- the reader's hand moving
    // off and on -- until a read finds the light on. One read, not three:
    // while the bodies anchor the pane clears the hover every few hundred
    // milliseconds, and the claim is that resting lights it, not that the
    // pane holds it through its own rebuilds.
    const heldRow = page.locator(bodyRowSel).first();
    // Since 2026-11-12 the page posts its ONE light (`light <json>`): a body
    // hovered glows every one of its parts at their resting look, with its
    // bound faces harder, and nothing goes opaque.
    const lit = (w) => !!(w.__lastLight && w.__lastLight.layers.some((l) =>
      l.role === "hover" && l.tier === "own" && l.partOverlays > 0) &&
      w.__lastLight.action && w.__lastLight.action.about.length > 0 &&
      w.AnnotateApp.exec(["scene-view"]).every((r) => !r.visible || r.opacity < 1) &&
      w.__lastLight.action.about.every((sha) => w.__scene.lookOf(sha) !== "faint"));
    let bodyLit = false;
    let lastSeen = null;
    // Every `light` the page posts into the pane, for the diagnosis below.
    await inPane((w) => {
      w.__heardLight = [];
      w.addEventListener("message", (e) => {
        const m = e.data;
        if (m && m.type === "annotate:exec" && m.command && m.command[0] === "light") {
          w.__heardLight.push(String(m.command[1]).slice(0, 200));
          if (m.command[1] !== "clear") w.__lastLightWord = m.command[1];
        }
      });
      // The predicate's clauses, sampled whenever a light is standing.
      w.__lightSamples = [];
      w.setInterval(() => {
        const L = w.__lastLight;
        if (!L) return;
        const view = w.AnnotateApp.exec(["scene-view"]);
        w.__lightSamples.push({
          own: L.layers.filter((l) => l.role === "hover" && l.tier === "own").map((l) => l.partOverlays),
          about: L.action ? L.action.about.length : null,
          opaque: view.filter((r) => r.visible && !(r.opacity < 1)).map((r) => [r.part, r.look, r.opacity]).slice(0, 4),
          aboutFaint: L.action ? L.action.about.filter((sha) => w.__scene.lookOf(sha) === "faint").length : null,
        });
        if (w.__lightSamples.length > 6) w.__lightSamples.shift();
      }, 50);
      return true;
    });
    {
      const end = Date.now() + 20000;
      const hoverErrors = [];
      await heldRow.hover({ timeout: 5000 }).catch((e) => hoverErrors.push(String(e.message).slice(0, 120)));
      while (Date.now() < end) {
        // Polled, not sampled: between two of the pane's rebuilds the light is
        // on for a moment, and a read 300ms later missed it every time.
        if (await until(lit, bodyName, 1500)) { bodyLit = true; break; }
        const pageSide = await page.evaluate((sel) => {
          const row = document.querySelector(sel);
          const b = row && row.getBoundingClientRect();
          const under = b ? document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) : null;
          return { hot: Array.from(document.querySelectorAll("#navtree .navtree__row--hot")).map((n) => n.getAttribute("data-nav-id")),
            under: under ? under.tagName + "." + (under.className || "").toString().slice(0, 60) : null,
            box: b ? [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)] : null };
        }, bodyRowSel);
        lastSeen = Object.assign({ pageSide, hoverErrors }, await inPane((w) => {
          const L = w.__lastLight;
          const view = w.AnnotateApp.exec(["scene-view"]);
          return { light: L ? L.layers : null, about: L && L.action ? L.action.about.length : null,
            aboutFaint: L && L.action ? L.action.about.filter((sha) => w.__scene.lookOf(sha) === "faint").length : null,
            opaque: view.filter((r) => r.visible && !(r.opacity < 1)).map((r) => [r.part, r.look, r.opacity]).slice(0, 6),
            banner: (w.document.querySelector("#notice-text") || {}).textContent || "",
            heard: (w.__heardLight || []).map((c) => c.slice(0, 40)),
            samples: w.__lightSamples || [],
            replay: (() => {
              if (!w.__lastLightWord) return null;
              try { const r = w.AnnotateApp.exec(["light", w.__lastLightWord]); return { ok: true, light: !!w.__lastLight, r: r ? Object.keys(r) : null }; }
              catch (e) { return { ok: false, error: String(e && e.stack || e).slice(0, 600) }; }
            })(),
            lastResult: (w.__shellMessages || {})["annotate:result"] || null };
        }));
        await page.locator("#navtree h2.navtree__heading").first().hover({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(100);
        await heldRow.hover({ timeout: 2000 }).catch((e) => hoverErrors.push(String(e.message).slice(0, 120)));
      }
    }
    if (!bodyLit) {
      console.log(`      [${label}] DIAG body hover ${bodyName}: rows ` +
        `${await page.locator(bodyRowSel).count()}; last seen under the pointer ${JSON.stringify(lastSeen)}`);
    }
    push("[real] resting on a body row in the nav lights that body in the scene: every part of it " +
      "glows at its resting look, the rest go faint, and nothing is opaque", bodyLit);
    // Left for a heading -- inside the nav, on no row -- so the only thing
    // that can take the light down is the row's own leave.
    await page.locator("#navtree h2.navtree__heading").first().hover({ timeout: 5000 }).catch(() => {});
    push("[real] ...and leaving it takes the light down",
      await until((w) => w.__lastLight === null, null, 10000));

    // A feature row in the nav selects its node: the page's selection, and
    // the scene's layer selects it too (the `model select node` the page
    // posts). The pitch link's lower bearing centre: its part is opened first.
    const FEATURE_PART = "pitch_link";
    const FEATURE_NODE = "pitch_link_lower_sphere_centre";
    const featureSel = `#navtree [data-nav-kind="feature"][data-nav-id="${FEATURE_PART}@${FEATURE_NODE}"]`;
    await page.locator(`#navtree [data-nav-twisty="p:${FEATURE_PART}"]`).first().click({ timeout: 5000 }).catch(() => {});
    await page.locator(featureSel).first().click({ timeout: 5000 }).catch(() => {});
    const nodeSelected = await until((w, id) => w.__lastModelSelection &&
      w.__lastModelSelection.kind === "node" && w.__lastModelSelection.id === id, FEATURE_NODE, 10000);
    await page.waitForSelector(featureSel + ".navtree__row--on", { timeout: 5000 }).catch(() => {});
    // The feature's row under its part is `--on`; since 2026-11-12 the same
    // feature's end row under the interface it is on is revealed and lit too.
    push("[real] clicking a feature row in the nav selects its node in the scene, and the row " +
      "and the map's pin show it selected",
      nodeSelected && await page.locator(featureSel + ".navtree__row--on").count() >= 1 &&
      await page.locator(`#topopane g.map__pin--selected[data-map-id="${FEATURE_PART}@${FEATURE_NODE}"]`).count() === 1);

    // ...and its body: the pitch link's lower bearing centre is bound in the
    // real log, so since 2026-11-12 (a_binding_shows_the_moment_it_is_made_
    // and_is_corrected_where_it_is_shown) the body is the model's own line --
    // the face and the part -- with Correct and Unbind, not the pane's rows.
    const featureBody = (sel) => page.evaluate((s) => {
      const row = document.querySelector(s);
      const slot = row && row.parentNode.querySelector(".navtree__scene");
      const body = slot && slot.querySelector(".navtree__featurebody");
      return body ? { kind: body.getAttribute("data-body-kind"),
        line: (body.querySelector(".navtree__featurewords") || {}).textContent || "",
        acts: Array.from(body.querySelectorAll("button")).map((b) => b.textContent) } : null;
    }, sel);
    await page.waitForFunction((sel) => {
      const row = document.querySelector(sel);
      return !!(row && row.parentNode.querySelector('.navtree__featurebody[data-body-kind="bound"]'));
    }, featureSel, { timeout: 15000 }).catch(() => {});
    const sweepBody = await featureBody(featureSel);
    console.log(`    the bound feature's body in sweep mode: ${JSON.stringify(sweepBody)}`);
    push("[real] a bound feature's body is one line naming its face and its part, with Correct and Unbind",
      !!sweepBody && sweepBody.kind === "bound" && /^bound \u00b7 face \d+ of 213862-002$/.test(sweepBody.line) &&
      sweepBody.acts.indexOf("Correct") !== -1 && sweepBody.acts.indexOf("Unbind") !== -1);

    // The keyboard reaches the same rows: focus a feature row, Enter selects it.
    const OTHER_NODE = "pitch_link_upper_sphere_centre";
    const otherSel = `#navtree [data-nav-kind="feature"][data-nav-id="${FEATURE_PART}@${OTHER_NODE}"]`;
    await page.locator(otherSel).first().focus().catch(() => {});
    await page.keyboard.press("Enter");
    push("[real] a feature row is reached by the keyboard, and Enter selects its node",
      await until((w, id) => w.__lastModelSelection && w.__lastModelSelection.id === id, OTHER_NODE, 10000));

    // The other way: a node picked in the scene is the page's selection, so
    // its feature rows light in the nav -- and its part opens to show them.
    // Posted from the pane's own realm (the page listens for its frame's
    // messages only), as the scene's bead click does (AA.pickMessage).
    const paneFrame = page.frames().find((f) => f.url().indexOf("/annotate/") !== -1);
    if (paneFrame) {
      await paneFrame.evaluate((id) => {
        window.parent.postMessage({ type: window.AnnotateApp.PICK_MESSAGE, kind: "node", id }, window.location.origin);
      }, FEATURE_NODE).catch(() => {});
    }
    await page.waitForSelector(featureSel + ".navtree__row--on", { timeout: 5000 }).catch(() => {});
    push("[real] a node picked in the scene is selected in the nav",
      await page.locator(featureSel + ".navtree__row--on").count() >= 1);

    // A body's fold is the nav's own: since 2026-11-12 the row SELECTS the
    // body and its twisty alone folds it; the twisty says so, and its parts
    // leave the column.
    const foldBody = bodyRowSel;
    const partsBefore = await page.locator(`#navtree [data-nav-kind="part"]`).count();
    await page.locator(foldBody + " button.navtree__twisty").first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForFunction((n) => document.querySelectorAll('#navtree [data-nav-kind="part"]').length < n,
      partsBefore, { timeout: 5000 }).catch(() => {});
    const folded = await page.evaluate((sel) => {
      const row = document.querySelector(sel);
      return { expanded: row && row.querySelector(".navtree__twisty").getAttribute("aria-expanded"),
        parts: document.querySelectorAll('#navtree [data-nav-kind="part"]').length };
    }, foldBody);
    push("[real] a body's twisty in the nav folds it: it reads closed and the body's parts leave the column",
      folded.expanded === "false" && folded.parts < partsBefore);
    await page.locator(foldBody + " button.navtree__twisty").first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForFunction((n) => document.querySelectorAll('#navtree [data-nav-kind="part"]').length === n,
      partsBefore, { timeout: 5000 }).catch(() => {});

    // The body's show/hide box hides every part of it in the scene, reads
    // unticked, and ticking it again shows them.
    const hiddenNodes = () => inPane((w) => {
      let n = 0;
      for (const sha of w.__scene.parts.keys()) {
        n += w.__scene._occurrenceNodes(sha).filter((o) => !o.visible).length;
      }
      return n;
    });
    const checkBox = `${bodyRowSel} input.navtree__vis`;
    const shownBefore = await hiddenNodes();
    await page.locator(checkBox).first().click({ timeout: 5000 }).catch(() => {});
    const hidden = await until((w, was) => {
      let n = 0;
      for (const sha of w.__scene.parts.keys()) {
        n += w.__scene._occurrenceNodes(sha).filter((o) => !o.visible).length;
      }
      return n > was;
    }, shownBefore, 10000);
    await page.waitForFunction((sel) => {
      const box = document.querySelector(sel);
      return !!box && !box.checked && !box.indeterminate;
    }, checkBox, { timeout: 5000 }).catch(() => {});
    push("[real] a body's checkbox in the nav hides that body in the scene, and the box reads unticked after the redraw",
      hidden && await page.locator(checkBox).first().evaluate((b) => !b.checked && !b.indeterminate));
    await page.locator(checkBox).first().click({ timeout: 5000 }).catch(() => {});
    push("[real] ...and ticking it again shows the body",
      await until((w, was) => {
        let n = 0;
        for (const sha of w.__scene.parts.keys()) {
          n += w.__scene._occurrenceNodes(sha).filter((o) => !o.visible).length;
        }
        return n === was;
      }, shownBefore, 10000));
    const bodyRow = null;

    // A word the annotator has no branch for says so; a key that is gone (a
    // rebuild racing the gesture) does not.
    const warnings = [];
    const onConsole = (m) => { if (m.type() === "warning") warnings.push(m.text()); };
    page.on("console", onConsole);
    const sendRail = (msg) => page.evaluate((m) => {
      document.querySelector("#annotate-flyout iframe").contentWindow
        .postMessage(Object.assign({ type: "annotate:rail" }, m), window.location.origin);
    }, msg);
    const anyKey = await page.evaluate(() => {
      const n = document.querySelector("#navtree .navtree__scene [data-scene-key]");
      return n ? n.getAttribute("data-scene-key") : null;
    });
    await sendRail({ key: "#sweep-tree/gone", act: "check" });
    await sendRail({ key: anyKey || "#sweep-tree/none", act: "wobble" });
    await page.waitForTimeout(500);
    page.off("console", onConsole);
    push("[real] an unknown gesture word is warned about by name, and an unknown row is not",
      warnings.some((t) => t.indexOf("wobble") !== -1) && !warnings.some((t) => t.indexOf("#sweep-tree/gone") !== -1));

    // The width the reader chooses, on this page -- remembered for step 3.
    const seam = await page.locator("#flyout-divider").boundingBox();
    if (seam) {
      await page.mouse.move(seam.x + seam.width / 2, seam.y + 300);
      await page.mouse.down();
      await page.mouse.move(seam.x + seam.width / 2 - 60, seam.y + 300, { steps: 6 });
      await page.mouse.up();
    }
    const chosenBox = await page.locator("#annotate-flyout").boundingBox();
    const chosen = chosenBox ? chosenBox.width : -1;

    // --- 2. a chain study in the nav -> bind mode on that study -------------
    // Not thrown on: a rail that is not there must fail the rail's own check
    // below, by name, rather than take the suite down here.
    await page.locator(navRow("study", CHAIN)).click({ timeout: 5000 }).catch(() => {});
    const bindMode = await until((w) => !w.__sweep &&
      w.document.querySelectorAll(".an__rail .el-row").length > 0 &&
      !w.document.querySelector(".an__sweep-summary"));
    const railStudy = bindMode
      ? await inPane((w) => w.__selection.study) : null;
    push("[real] selecting a chain study in the nav leaves sweep mode: the bar is " +
      "gone and the annotator lists that study's elements",
      bindMode && railStudy === CHAIN);
    const chainTitle = topology.studies.find((s) => s.id === CHAIN).title;
    await page.waitForFunction(() => /^Binding/.test(
      document.querySelector("#flyout-title").textContent), null, { timeout: 15000 }).catch(() => {});
    push("[real] ...and the head line follows it into bind mode, named by the study",
      (await headLine()) === "Binding — " + chainTitle);
    push("[real] the nav stays beside the open pane -- it is what drives it",
      await page.locator("#navtree").isVisible());
    // In bind mode the same bound feature's body is the same line: it is the
    // model's, whatever the pane lists. Its Correct arms the pick on the
    // feature's own part in bind mode too, and Cancel ends it.
    const CHAIN_NODE = "pitch_link_lower_sphere_centre";
    const chainFeature = `#navtree [data-nav-kind="feature"][data-nav-id="pitch_link@${CHAIN_NODE}"]`;
    if (!(await page.locator(chainFeature).count())) {
      await page.locator(`#navtree [data-nav-twisty="p:pitch_link"]`).first().click({ timeout: 5000 }).catch(() => {});
    }
    await page.locator(chainFeature).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForFunction((sel) => {
      const row = document.querySelector(sel);
      return !!(row && row.parentNode.querySelector('.navtree__featurebody[data-body-kind="bound"]'));
    }, chainFeature, { timeout: 15000 }).catch(() => {});
    const bindBody = await featureBody(chainFeature);
    console.log(`    ...in bind mode: ${JSON.stringify(bindBody)}`);
    push("[real] in bind mode a bound feature's body is the same line and the same actions",
      !!bindBody && !!sweepBody && bindBody.kind === "bound" && bindBody.line === sweepBody.line &&
      bindBody.acts.join() === sweepBody.acts.join());
    const chainEnds = (topology.edges || []).filter((e) => e.part === "pitch_link" &&
      (e.from === CHAIN_NODE || e.to === CHAIN_NODE)).map((e) => e.id)
      .concat((topology.edges || []).filter((e) => e.kind !== "structural" &&
        (e.from === CHAIN_NODE || e.to === CHAIN_NODE)).map((e) => e.id));
    await page.locator(`${chainFeature} ~ .navtree__scene button[data-body-act="arm"]`).first()
      .click({ timeout: 5000 }).catch(() => {});
    const armedAt = await until((w) => w.__embedTree && w.__embedTree.armed && w.__embedTree.armedEnd
      ? w.__embedTree.armedEnd.edgeId : false, null, 30000) ? await inPane((w) => w.__embedTree.armedEnd.edgeId) : null;
    await page.waitForFunction((sel) => {
      const row = document.querySelector(sel);
      return !!(row && row.parentNode.querySelector('.navtree__featurebody[data-body-kind="armed"]'));
    }, chainFeature, { timeout: 10000 }).catch(() => {});
    const armedBody = await featureBody(chainFeature);
    // The feature is bound, so the armed body offers Unbind beside Cancel
    // (2026-11-18, a_disagreement_is_settled_by_keep_or_let_go).
    push("[real] ...and its Correct arms the pick in bind mode, at one of the feature's own ends, " +
      "and the body says so with a Cancel",
      !!armedAt && chainEnds.indexOf(armedAt) !== -1 && !!armedBody && armedBody.kind === "armed" &&
      armedBody.acts.join() === "Cancel,Unbind" && await inPane((w) => !w.__sweep && !!w.__scene.pickFilter()));
    await page.locator(`${chainFeature} ~ .navtree__scene button[data-body-act="arm-off"]`).first()
      .click({ timeout: 5000 }).catch(() => {});
    await page.waitForFunction((sel) => {
      const row = document.querySelector(sel);
      return !!(row && row.parentNode.querySelector('.navtree__featurebody[data-body-kind="bound"]'));
    }, chainFeature, { timeout: 10000 }).catch(() => {});
    push("[real] Cancel ends the pick: nothing is armed, the ray sees every part, and the body is the bound line again",
      await inPane((w) => !w.__embedTree.armed && !w.__scene.pickFilter()) &&
      ((await featureBody(chainFeature)) || {}).kind === "bound");
    if (SHELL_SCENE_SHOTS) {
      await page.screenshot({ path: join(SHELL_SCENE_SHOTS, "1600_chain.png") });
    }

    // --- 3. reload -> the pane reopens at its width (on the page the URL
    // names, the kinematic study) ---------------------------------------------
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("div.kmverdict", { timeout: 30000 });
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 }).catch(() => {});
    const reopened = await page.locator("#annotate-flyout").boundingBox();
    push("[real] a reload reopens the pane the reader left open, at the width " +
      "they left it",
      await page.locator("#annotate-flyout").evaluate((n) => n.open) &&
      reopened && chosen > 0 && Math.abs(reopened.width - chosen) <= 1);

    // --- 4. hover crosses the seam ------------------------------------------
    // The sweep's first PLACED part, in the scene (see the synthetic binding in
    // installRealAnnotatorReads for why placed and not opened).
    const opened = await until((w) => w.__sweep && w.__sweep.anchored &&
      w.__sweep.anchored.length > 0 && w.__scene &&
      w.__scene.parts.has(w.__sweep.anchored[0]), null, 120000);
    // Since 2026-11-12 a hovered row is the page's ONE light (`light <json>`),
    // not a `highlight`: the edge's bound face is OVERLAID in the scene, on
    // the part at its resting look, harder than the part's own glow -- and
    // the colour buffer is left alone (the pick tint is the selection's).
    await clearPoint(page, `#topogrid tr.tvrow[data-id="${boundRow.edge}"] td.tvcell--name`, "hover");
    const overlaid = opened && await until((w) => !!(w.__lastLight && w.__lastLight.layers.some((l) =>
      l.role === "hover" && l.tier === "own" && l.faceOverlays > 0)));
    const face = overlaid ? await inPane((w) => {
      const own = w.__lastLight.layers.find((l) => l.role === "hover" && l.tier === "own");
      const first = w.__sweep.anchored[0];
      const mesh = w.__scene.parts.get(first);
      const at = mesh.userData.faceRanges[0].start * 3;
      const live = mesh.geometry.attributes.color.array;
      const base = mesh.userData.baseColors;
      // The parts the light is about (the hovered edge's bound faces' parts):
      // each at its resting look, never faint, never solid.
      const about = (w.__lastLight.action && w.__lastLight.action.about) || [];
      return { first, faceOverlays: own.faceOverlays, faceOpacity: own.faceOpacity, partOpacity: own.partOpacity,
        aboutLooks: about.map((sha) => w.__scene.lookOf(sha)),
        aboutOpacities: about.map((sha) => w.__scene.opacityOf(sha)),
        buffer: live[at] !== base[at] || live[at + 1] !== base[at + 1] || live[at + 2] !== base[at + 2],
        opaque: w.AnnotateApp.exec(["scene-view"]).filter((r) => r.visible && r.opacity >= 1).length };
    }) : null;
    if (face) console.log(`      [${label}] bound row ${boundRow.edge} hovered: ${JSON.stringify(face)}`);
    if (!face) {
      console.log(`      [${label}] DIAG bound row ${boundRow.edge} (bound in the served log: ${boundInLog(boundRow.edge)}): ` +
        `opened ${opened}; light ${JSON.stringify(await inPane((w) => w.__lastLight))}`);
    }
    push("[real] resting on a bound contributor row overlays its face in the annotator, harder than the " +
      "part's glow, on a part that keeps its resting look -- the colour buffer untouched and nothing opaque",
      !!face && face.faceOverlays > 0 && face.faceOpacity > face.partOpacity && face.aboutLooks.length > 0 &&
      face.aboutLooks.every((l) => l === "ghost" || l === "solid") && face.aboutOpacities.every((o) => o < 1) &&
      !face.buffer && face.opaque === 0);

    // --- 5. a row CLICK selects in place: the scene stays in the sweep -------
    // (2026-10-26.) The page keeps the study, the pane is not sent a goto,
    // and the selected edge is what the scene highlights once the pointer
    // rests on nothing in particular.
    await clearPoint(page, `#topogrid tr.tvrow[data-id="${bound.edge}"] td.tvcell--name`, "click")
      .catch(() => {});
    await page.mouse.move(5, 5);
    const stillSwept = await until((w, run) => w.__sweep && w.__sweep.artifact &&
      w.__sweep.artifact.runId === run && !!w.__lastHighlight, study.sweep.run_id, 15000);
    push("[real] clicking a contributor row with the pane open keeps the page on the " +
      "study and the annotator in sweep mode, the edge highlighted",
      stillSwept && /^Sweep — /.test(await headLine()) &&
      await page.locator("div.kmverdict").count() === 2 &&
      await page.locator(`#topogrid tr.tvrow--selected[data-id="${bound.edge}"]`).count() === 1);

    // --- 6. the room the DAG and grid get on a chain study ------------------
    // With the scene at its floor and the results pane beside them, the DAG
    // and grid keep at least the room the scene's clamp reserves for them;
    // closing the scene gives its column back to them.
    await page.locator(navRow("study", CHAIN)).click({ timeout: 5000 }).catch(() => {});
    await page.waitForSelector("svg.tv__map", { timeout: 15000 }).catch(() => {});
    const floorSeam = await page.locator("#flyout-divider").boundingBox();
    if (floorSeam) {
      await page.mouse.move(floorSeam.x + floorSeam.width / 2, floorSeam.y + 300);
      await page.mouse.down();
      await page.mouse.move(floorSeam.x - 2000, floorSeam.y + 300, { steps: 6 });
      await page.mouse.up();
    }
    const atFloor = await page.evaluate(() => ({
      scene: Math.round(document.querySelector("#annotate-flyout").getBoundingClientRect().width),
      // The DAG's region: the grid has a column of its own since 2026-11-14.
      main: Math.round(document.querySelector("#topopane").getBoundingClientRect().width),
      floor: window.ViewerApp.FLYOUT_WIDTH.min,
      reserve: window.ViewerApp.FLYOUT_WIDTH.reserve,
      detail: getComputedStyle(document.querySelector("#detail")).display,
    }));
    await page.locator("#flyout-collapse").click({ timeout: 5000 }).catch(() => {});
    await page.waitForFunction(() => !document.body.classList.contains("flyout-open"),
      null, { timeout: 5000 }).catch(() => {});
    const noPane = await page.evaluate(() => ({
      main: Math.round(document.querySelector("#topopane").getBoundingClientRect().width),
      detail: getComputedStyle(document.querySelector("#detail")).display,
    }));
    console.log(`    [chain study at 1600] DAG + grid: ${atFloor.main}px with the scene at ` +
      `its ${atFloor.scene}px floor, ${noPane.main}px with no scene open`);
    push("[real] on a chain study at 1600 wide, the DAG and grid keep the scene's " +
      "reserve with the scene at its floor and the results pane beside them",
      atFloor.scene === atFloor.floor && atFloor.main >= atFloor.reserve &&
      atFloor.detail !== "none");
    push("[real] ...and closing the scene gives its column to the DAG and grid, " +
      "the results pane still there",
      noPane.main > atFloor.main && noPane.detail !== "none");

    if (SHELL_SCENE_SHOTS) {
      // The same two pages at 1920, the scene at its default width.
      const keys0 = await storedKeys();
      await page.evaluate((ks) => window.localStorage.removeItem(ks[0]), keys0);
      await page.setViewportSize({ width: 1920, height: 1000 });
      await page.goto(url + "/apps/viewer/topology.html?kinematic=" + STUDY, { waitUntil: "load" });
      await page.waitForSelector("div.kmverdict", { timeout: 30000 });
      await openPaneByHandle(page);
      await until((w) => w.__sweep && w.__sweep.anchored && w.__sweep.anchored.length > 0 &&
        w.__sweep.anchored.every((sha) => w.__scene && w.__scene.parts.has(sha)), null, 120000);
      await page.waitForSelector('#navtree [data-nav-kind="body"]', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: join(SHELL_SCENE_SHOTS, "1920_kinematic.png") });
      await page.locator(navRow("study", CHAIN)).click({ timeout: 5000 }).catch(() => {});
      await page.waitForSelector('#navtree [data-nav-kind="study"].navtree__row--on',
        { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: join(SHELL_SCENE_SHOTS, "1920_chain.png") });
    }

    push("[real] nothing above produced an uncaught error", errors.length === 0);
    const keys = await storedKeys();
    await page.evaluate((ks) => ks.forEach((k) => window.localStorage.removeItem(k)), keys);
    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.closeAllConnections();
    server.close();
  }
}

// --- every study opens in 3D showing only its parts (handoff every_study_opens_
// in_3d_showing_only_its_parts) -------------------------------------------------
//
// On LIVE data, the pane booted as testThreeDPane boots it. For each study kind
// the row's own 3D control opens the pane and the scene is read back through the
// annotator's read-only `scene-view`: the ghost set is exactly the parts the
// page's own rule names for the study (VA.litPartIds, run in the page over the
// projection), every other installed part is faint, nothing is solid, and
// switching studies with the pane open re-filters. The Unused control's hide
// word hides the faint ones. On the kinematic study the three.js scene itself
// is read too -- every drawn mesh's opacity at rest -- and a body's checkbox
// unticked must leave nothing of the body drawn, on any part (handoff
// everything_in_3d_is_transparent_until_an_action_needs_a_face).
async function testEveryStudyOpensIn3D(browser, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const topology = topologies && (topologies.topologies || [])
    .find((t) => (t.studies || []).some((s) => s.id === "pitch_link_cotter_hole_clearance"));
  const kinematic = await readProjection("kinematic/kinematic_studies.json");
  const kin = kinematic && (kinematic.studies || [])[0];
  if (!topology || !kin) {
    push("[real] every study opens in 3D (skipped: the topology and kinematic " +
      "projections are not built -- build them, or pass --repo <main checkout>)", true);
    return reportSuite(label, checks, errors);
  }
  const index = await realDataIndexForTheAnnotator();
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await installRealAnnotatorReads(page, { meshes: index.meshes, runs: index.runs,
    aliases: index.aliases, binding: "real" });
  const frameOf = () => page.frames().find((f) => f.url().includes("/annotate/"));
  const run = (cmd) => frameOf().evaluate((c) => window.AnnotateApp.exec(c), cmd);
  // The scene once it has stopped changing; failures swallowed, never thrown (a
  // thrown wait carries no check name, and its witness reads as a MISS).
  // `ready(now)` is the state the check expects; the wait ends when the view is
  // stable AND ready, or at the bound -- a stale scene read right after a switch
  // would otherwise pass for the new one.
  const scene = async (ready) => {
    let last = "", stable = 0, now = null;
    const read = (view) => {
      const names = (rows) => rows.map((r) => r.part || r.sha256).sort();
      return { open: view.length,
        solid: names(view.filter((r) => r.visible && r.look === "solid")),
        ghost: names(view.filter((r) => r.visible && r.look === "ghost")),
        faint: names(view.filter((r) => r.visible && r.look === "faint")),
        hidden: names(view.filter((r) => !r.visible)) };
    };
    for (let i = 0; i < 150 && stable < 3; i++) {
      let view = [];
      try { view = await run(["scene-view"]); } catch { view = []; }
      if (!Array.isArray(view)) view = [];
      now = read(view);
      const key = JSON.stringify(view);
      stable = key === last && view.length >= index.meshes.length &&
        (!ready || ready(now)) ? stable + 1 : 0;
      last = key;
      await page.waitForTimeout(500);
    }
    return now;
  };
  // The part ids the page's own rule names for a study (kind "topology" = the
  // whole walk), resolved to installed meshes by the part-mesh alias table.
  const wanted = async (kind, topoId, studyId) => {
    const ids = await page.evaluate(({ topologies, kind, topoId, studyId, kin }) => {
      const VA = window.ViewerApp;
      const topo = VA.findTopology(topologies, topoId);
      if (kind === "kinematic") return VA.litPartIds(topo, VA.kinematicLitSet(kin, topo));
      const study = studyId ? (topo.studies || []).find((s) => s.id === studyId) : null;
      return VA.litPartIds(topo, study ? VA.studyLitSet(study, topo) : null);
    }, { topologies, kind, topoId, studyId, kin });
    // Resolved by the annotator's own rule, in its own frame.
    const parts = await frameOf().evaluate(({ ids, meshes, aliases }) => ids
      .map((id) => window.AnnotateApp.resolveMeshIdentifier(meshes, id, aliases))
      .filter(Boolean).map((m) => m.part_id || m.sha256),
    { ids, meshes: index.meshes, aliases: index.aliases.aliases || index.aliases });
    return Array.from(new Set(parts)).sort();
  };
  const press3D = async (kind, id) => {
    if (kind === "topology") {
      // The whole model's 3D is the seam's handle on the picker's choice: the
      // topology row and its control left with the rows (2026-11-10). A pane
      // already open re-drives on the pick itself.
      await pickModel(page, id);
      const handle = page.locator("#pane-handle");
      if (await handle.isVisible().catch(() => false)) await handle.click();
      return true;
    }
    const row = page.locator(`[data-nav-kind="${kind}"]${id ? `[data-nav-id="${id}"]` : ""}`).first();
    await row.hover();
    const btn = row.locator("[data-nav-3d]");
    if (await btn.count() !== 1) return false;
    await btn.click();
    // Off the tree: a part row that slides under a resting pointer is a hover,
    // and the scene ghosts a hovered part (the tree re-lays when the pane
    // opens, so which row that is depends on the shell).
    await page.mouse.move(5, 5);
    return true;
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  try {
    // The studies below are v1's; v1 is opened by link (the default model is
    // studyless v2 since 2026-11-08, and only the open model lists studies).
    await page.goto(url + "/apps/viewer/topology.html?topology=vpa_pitch_linkage", { waitUntil: "load" });
    await page.waitForSelector('[data-nav-kind="study"]', { timeout: 30000 });

    const bound = await press3D("study", "pitch_link_cotter_hole_clearance");
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 10000 }).catch(() => null);
    push("[real] a chain study with bound faces offers 3D, and its row opens the pane",
      bound && await page.locator("#annotate-flyout").evaluate((n) => n.open));
    let want = await wanted("study", topology.id, "pitch_link_cotter_hole_clearance");
    let now = await scene((n) => same(n.ghost, want));
    push("[real] its scene ghosts exactly the study's parts, draws the rest faint and nothing solid",
      same(now.ghost, want) && want.length > 0 && now.faint.length > 0 && now.solid.length === 0 &&
      now.hidden.length === 0);

    const kin3D = await press3D("kinematic", kin.id);
    want = await wanted("kinematic", kin.topology, null);
    now = await scene((n) => same(n.ghost, want));
    push("[real] a kinematic study offers 3D, and switching to it re-filters the open pane",
      kin3D && same(now.ghost, want) && want.length > 0 && now.faint.length > 0);

    // Every mesh the renderer would draw, read off the three.js scene rather
    // than the app's report of it: the part itself or one of its repeats (an
    // overlay, a bead or a leader is not a part), with its opacity and key.
    const drawnMeshes = () => frameOf().evaluate(() => {
      const sc = window.__scene;
      const ofGeometry = new Map();
      for (const [sha, m] of sc.parts) ofGeometry.set(m.geometry, sha);
      const rows = [];
      sc.scene.traverseVisible((o) => {
        const sha = o.isMesh ? ofGeometry.get(o.geometry) : null;
        if (!sha || !(o === sc.parts.get(sha) || o.userData.occurrence)) return;
        rows.push({ sha, key: o.userData.key == null ? null : o.userData.key,
          opacity: o.material.transparent ? o.material.opacity : 1 });
      });
      return rows;
    });
    const wantShas = await frameOf().evaluate(({ want }) => window.__scene.listOpenParts()
      .filter((sha) => want.indexOf((window.__scene.parts.get(sha).userData.manifest || {}).part_id) !== -1),
    { want });
    const atRest = await drawnMeshes();
    const restOk = atRest.length > 0 && atRest.every((r) =>
      Math.abs(r.opacity - (wantShas.indexOf(r.sha) !== -1 ? 0.22 : 0.07)) < 1e-6);
    console.log(`      kinematic at rest: ${atRest.length} drawn meshes, ` +
      `${atRest.filter((r) => r.opacity >= 1).length} opaque`);
    push("[real] at rest on the kinematic study every drawn mesh is translucent -- its study's " +
      "parts at the ghost opacity, every other at the faint one",
      kin3D && restOk && atRest.some((r) => r.opacity > 0.1) && atRest.some((r) => r.opacity < 0.1));

    // The base body's checkbox: nothing of it drawn, on ANY part -- the
    // mount installation's machined detail is its own mesh in the same
    // place, and that copy is the one this check exists for.
    const BODY = "base";
    // The rail lists the run's bodies a beat after the scene settles; ask
    // until it knows the body (bounded), and say why when it never does.
    let hid = null, hideErr = null;
    for (let i = 0; i < 60 && !(hid && hid.occurrences > 0); i++) {
      try { hid = await run(["hide-body", BODY]); hideErr = null; } catch (e) { hideErr = String(e); hid = null; }
      if (!(hid && hid.occurrences > 0)) await page.waitForTimeout(500);
    }
    if (hideErr) console.log(`      hide-body ${BODY}: ${hideErr}`);
    await page.waitForTimeout(500);
    const hiddenKeys = await frameOf().evaluate(() => {
      const out = [];
      for (const m of window.__scene.parts.values()) for (const k of m.userData.hiddenKeys) out.push(k);
      return out;
    });
    const onHiddenPath = (key) => key != null && hiddenKeys.some((h) => h != null &&
      (key === h || key.startsWith(h + "/") || h.startsWith(key + "/")));
    const bodyGone = await drawnMeshes();
    const twinsTaken = atRest.filter((r) => onHiddenPath(r.key) && hiddenKeys.indexOf(r.key) === -1).length;
    console.log(`      ${BODY} hidden: ${hiddenKeys.length} keys, ${atRest.length - bodyGone.length} ` +
      `drawn meshes taken down, ${twinsTaken} of them another part's copy`);
    push("[real] a hidden body contributes zero drawn occurrences -- its parts, and every other " +
      "part's copy of them on the same assembly path",
      !!hid && hid.occurrences > 0 && hiddenKeys.length > 0 && twinsTaken > 0 &&
      bodyGone.filter((r) => onHiddenPath(r.key)).length === 0);
    await run(["show-body", BODY]).catch(() => null);
    await page.waitForTimeout(500);
    const back = await drawnMeshes();
    const id = (r) => r.sha + "|" + r.key;
    const takenDown = atRest.filter((r) => onHiddenPath(r.key)).map(id);
    const backIds = back.map(id);
    const missing = takenDown.filter((k) => backIds.indexOf(k) === -1);
    if (missing.length) console.log(`      not back after ticking ${BODY}: ${missing.join(", ")}`);
    push("[real] ...and ticking it again draws every one of them back",
      takenDown.length > 0 && missing.length === 0);

    const none = await press3D("study", "rotor_fastener_grip_u2h");
    want = await wanted("study", topology.id, "rotor_fastener_grip_u2h");
    now = await scene((n) => same(n.ghost, want));
    push("[real] a chain study with no bound face offers 3D and draws its own parts ghost",
      none && same(now.ghost, want) && want.length > 0 && now.faint.length > 0 && now.solid.length === 0);

    const top = await press3D("topology", topology.id);
    want = await wanted("topology", topology.id, null);
    now = await scene((n) => same(n.ghost, want));
    push("[real] the whole model opens in 3D from the picker and draws every one of its parts ghost",
      top && same(now.ghost, want) && want.length > 0 && now.solid.length === 0);

    await run(["model", "unlit", "hide"]);
    now = await scene((n) => n.faint.length === 0);
    push("[real] the Unused control's hide word hides every part the study does not cite",
      now.faint.length === 0 && now.hidden.length > 0 && now.ghost.length > 0);
    await run(["model", "unlit", "dim"]);

    await run(["isolate", "parts", "no_such_part_anywhere"]);
    await page.waitForTimeout(1500);
    push("[real] a scope with no installed mesh says so in the head line",
      /no 3D model for these parts yet/.test(await page.locator("#flyout-title").textContent()));

    push("[real] nothing above produced an uncaught error", errors.length === 0);
    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.closeAllConnections();
    server.close();
  }
}

// --- the annotator's rail in sweep mode: the mechanism, inspect only (handoff
// the_sweep_rail_shows_the_mechanism) ----------------------------------------
//
// Two halves. On ?mock=1: bind mode's rail is byte-for-byte the rail it was
// before this handoff (tests/fixtures/annotate/bind_rail_snapshot.json, taken
// from the tree before it), and leaving sweep mode leaves nothing of the tree
// behind. On REAL data -- P2, booted the way the viewer's pane boots it, with
// the kinematic study riding on the sweep link: the bind furniture is gone,
// the tree carries the run's bodies and joints, the pitch link opens into its
// sphere centres in their binding colour, the contributors follow the frame
// from one stop to the other, a selection tints a face, every clipped row
// keeps its text on hover at the rail's narrowest, and re-pick is the jump to
// bind mode on that edge. The bindings are synthetic (nothing is bound in the
// live inbox, the 3D-pane lesson's finding): both ends of the pitch link's
// length, on two faces of the first part the sweep opened.
const BIND_RAIL_SNAPSHOT = join(REPO, "tests", "fixtures", "annotate", "bind_rail_snapshot.json");
const WRITE_BIND_RAIL_SNAPSHOT = process.argv.includes("--write-bind-rail-snapshot");
const SWEEP_RAIL_RUN = "vpa-pitch-p2-20261105-204957";
const SWEEP_RAIL_STUDY = "vpa_pitch_linkage_blade_pitch_at_the_stops";

// --- an armed pick (a_face_is_picked_the_way_cad_picks_it) -------------------
//
// ?mock=1, the synthetic crank-slider: its pitch link's one feature is node
// `a`, bound through demo_edge_traced at its `from` end. The fixture's node
// names no part, so an init script gives it the demo triangle (the arm body's
// part) as the page loads -- the shared fixture is untouched, and every other
// suite reads it as it was. Writes are the mock adapter's captured list,
// never a folder.
async function testAnnotateArmedPick(browser, label) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}/apps/annotate/index.html`;
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    const AA = window.AnnotateApp = window.AnnotateApp || {};
    let fixtures;
    Object.defineProperty(AA, "FIXTURES", {
      configurable: true,
      get() { return fixtures; },
      set(v) {
        const demo = v.topologyProjection.topologies.find((t) => t.id === "demo_system");
        demo.nodes.find((n) => n.id === "a").parts = ["demo_triangle"];
        fixtures = v;
      },
    });
  });
  const ROW = '#sweep-tree .tree-row[data-feature="a"]';
  // A row's shape: its children's tags and base classes, in order.
  const rowShape = () => page.evaluate((sel) => {
    const li = document.querySelector(sel);
    const shape = (n) => n.tagName + "." + (n.className.split(" ")[0] || "") +
      (n.children.length ? "[" + Array.from(n.children).map(shape).join(",") + "]" : "");
    return li ? Array.from(li.children).map(shape) : null;
  }, ROW);
  const scene = () => page.evaluate((sel) => {
    const s = window.__scene;
    const AA = window.AnnotateApp;
    const sha = AA.FIXTURES.demoSha;
    const bracket = "1".repeat(63);
    const line = document.querySelector(sel + " .tree-row__face");
    return {
      filter: s.pickFilter(),
      index: window.__sweep && window.__sweep.index,
      home: window.__sweep && window.__sweep.asModelledIndex,
      armed: !!(window.__sweep && window.__sweep.armed),
      triangleGhost: s.isGhosted(sha), triangleShown: s.isVisible(sha),
      bracketGhost: s.isGhosted(bracket), bracketShown: s.isVisible(bracket),
      bracketOpacity: s.parts.get(bracket) ? s.parts.get(bracket).material.opacity : null,
      triangleOpacity: s.opacityOf(sha),
      camera: s.cameraState(),
      // How far the orbit target is from the armed part's drawn box centre.
      targetToPart: (() => {
        const mesh = s.parts.get(sha);
        if (!mesh) return null;
        const c = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix)
          .getCenter(s.camera.position.clone());
        return c.distanceTo(s.controls.target);
      })(),
      line: line ? line.textContent : null,
      pressed: (document.querySelector(sel + " > .tree-cands > .tree-cand--other") || { getAttribute: () => null })
        .getAttribute("aria-pressed"),
      action: (document.querySelector(sel + " > .tree-cands > .tree-cand--other") || {}).textContent || null,
      preselected: s.preselected(),
      cursor: s.renderer.domElement.style.cursor,
      writes: (window.__mockWrites || []).length,
    };
  }, ROW);
  // Where a face's centroid lands on the page, through its first occurrence.
  const faceOnScreen = (faceId, sha) => page.evaluate(([f, s]) => {
    const scn = window.__scene;
    const mesh = scn.parts.get(s || window.AnnotateApp.FIXTURES.demoSha);
    scn.scene.updateMatrixWorld();
    const c = mesh.userData.manifest.faces[f].centroid_native;
    const v = scn.camera.position.clone().set(c[0], c[1], c[2]).applyMatrix4(mesh.matrixWorld).project(scn.camera);
    const r = scn.renderer.domElement.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  }, [faceId, sha]);
  try {
    await page.goto(url + "?embedded=1&mock=1", { waitUntil: "load" });
    await page.waitForSelector("#element-list li.el-row", { timeout: 15000 });
    await page.evaluate(() => window.AnnotateApp.exec(["sweep", "synthetic-demo-sweep"]));
    await page.waitForFunction(() => window.__sweep && document.getElementById("sweep-tree") &&
      window.__scene.listOpenParts().length > 0, null, { timeout: 15000 });
    // A second, unanchored part in the scene, so "every other part" is not empty.
    await page.evaluate(() => window.AnnotateApp.exec(["show", "1".repeat(63)]));
    await page.evaluate(() => { document.querySelector('#sweep-tree [data-joint="pitch_link"]').open = true; });
    await page.waitForSelector(ROW, { timeout: 5000 });
    const shapeAway = await rowShape();
    const before = await scene();

    // --- arm: the pose, the isolation, the frame, one template -------------
    await page.locator(ROW).hover();
    await page.locator(ROW + " > .tree-cands > .tree-cand--other").click();
    await page.waitForFunction(() => window.__sweep.armed && window.__scene.pickFilter(), null, { timeout: 5000 });
    const armed = await scene();
    // What the arm saved to give back -- the camera at the moment of arming
    // (the sweep's own framing may still have been settling when `before` was read).
    const saved = await page.evaluate(() => window.__sweep.armed.restore.camera);
    const sameCamera = (a, b) => !!a && !!b && a.position.concat(a.target)
      .every((v, i) => Math.abs(v - b.position.concat(b.target)[i]) < 1e-3);
    const shapeArmed = await rowShape();
    push("Pick on a joint end moves the sweep to the as-modelled pose itself, with no prompt",
      before.index !== before.home && armed.index === armed.home &&
      !(await page.locator(".an__sweep-gate").isVisible()));
    // Nothing goes opaque (2026-11-12): the armed part keeps its resting
    // look -- see-through -- and every other part goes faint.
    push("arming keeps the end's part at its resting look, never opaque, and ghosts every other part faint",
      armed.triangleShown && armed.triangleGhost && armed.triangleOpacity < 1 && armed.bracketGhost &&
      armed.bracketOpacity > 0 && armed.bracketOpacity < 0.15);
    push("arming filters the pick to the end's part and moves the camera onto it",
      JSON.stringify(armed.filter) === JSON.stringify([await page.evaluate(() => window.AnnotateApp.FIXTURES.demoSha)]) &&
      before.targetToPart > 5 && armed.targetToPart < 0.5);
    push("the armed row says it is at the as-modelled pose, and its pick action reads Cancel, pressed",
      armed.line === "at the as-modelled pose for picking" && armed.pressed === "true" &&
      armed.action === "Cancel" && before.action === "Pick a face\u2026");
    // The row's children: its text (name and state line), then its own
    // buttons where it has any (an armed pick's), then its list last -- the
    // candidate faces and the one pick action (2026-11-10).
    const rowTemplate = (shape) => shape && shape.length >= 2 &&
      shape.slice(1, -1).every((s) => s.indexOf("BUTTON.") === 0) &&
      shape[shape.length - 1].indexOf("UL.tree-cands") === 0;
    push("one row template away from the pose and armed at it: name and state line, then " +
      "the actions, then the list with the one pick action last",
      JSON.stringify(shapeAway.slice(0, 1)) === JSON.stringify(shapeArmed.slice(0, 1)) &&
      rowTemplate(shapeArmed) && rowTemplate(shapeAway));

    // --- the others toggle --------------------------------------------------
    await page.locator(ROW + " .tree-row__others").click();
    const hidden = await scene();
    push("the armed row's toggle hides the other parts instead, and is remembered",
      !hidden.bracketShown && await page.evaluate(() =>
        window.localStorage.getItem("tolstack.annotate.armOthers") === "hide"));
    await page.locator(ROW + " .tree-row__others").click();

    // --- hover pre-selects, the filter rules others out ----------------------
    // The demo triangle is flat in its own XY plane and the framing camera
    // looks along +Y, so it is framed edge-on: tilt the view onto it (an
    // orbit a reader would make; ending the pick still restores the camera
    // it found before arming, which is what the restore check compares).
    await page.evaluate(() => {
      const s = window.__scene;
      const t = s.cameraState().target;
      s.setCameraState({ position: [t[0], t[1] - 6, t[2] + 12], target: t });
    });
    const face1 = await faceOnScreen(1);
    await page.mouse.move(face1.x, face1.y, { steps: 3 });
    await page.waitForFunction(() => window.__scene.preselected(), null, { timeout: 3000 }).catch(() => {});
    const hover = await scene();
    push("a hover over the armed part's face pre-selects it: a tint and an outline on every " +
      "occurrence, the crosshair, and the state line names the face",
      hover.preselected && hover.preselected.faceId === 1 && hover.preselected.overlays >= 2 &&
      hover.cursor === "crosshair" && /^face 1( · |$)/.test(hover.line || ""));
    const away = await page.evaluate(() => {
      const r = window.__scene.renderer.domElement.getBoundingClientRect();
      return { x: r.left + 8, y: r.bottom - 8 };
    });
    await page.mouse.move(away.x, away.y, { steps: 3 });
    await page.waitForFunction(() => !window.__scene.preselected(), null, { timeout: 3000 }).catch(() => {});
    const off = await scene();
    push("off the part, nothing is pre-selected and the cursor is the default",
      !off.preselected && off.cursor === "" && off.line === "at the as-modelled pose for picking");
    const filtered = await page.evaluate(() => {
      const s = window.__scene;
      const bracket = "1".repeat(63);
      s.scene.updateMatrixWorld();
      const mesh = s.parts.get(bracket);
      // The mock bracket shares the triangle's manifest, so its manifest
      // centroid is not on its own geometry: aim at its first face's vertices.
      const p = mesh.geometry.attributes.position.array;
      const c = [0, 1, 2].map((k) => (p[k] + p[3 + k] + p[6 + k]) / 3);
      const v = s.camera.position.clone().set(c[0], c[1], c[2]).applyMatrix4(mesh.matrixWorld).project(s.camera);
      return { filtered: s.pick(v.x, v.y), all: s.pick(v.x, v.y, { all: true }) };
    });
    push("a ray at another part's face hits nothing while armed, and the unfiltered ray does",
      filtered.filtered === null && filtered.all && filtered.all.sha256 === "1".repeat(63));
    await page.evaluate(() => window.__scene.onPick(null, null, { sha256: "1".repeat(63), faceId: 0 }));
    const refused = await scene();
    push("a click on another part writes nothing, keeps the arm and the row says it is not on the part",
      refused.armed && refused.writes === before.writes && /^not on /.test(refused.line || ""));
    await page.evaluate(() => window.__scene.onPick(null, null, null));
    push("a click on empty space keeps the arm and writes nothing",
      (await scene()).armed && (await scene()).writes === before.writes);

    // --- the click binds -----------------------------------------------------
    // The demo triangle's two faces lie in one plane and do not touch: like
    // faces on one surface, interrupted, so the click offers them as a group
    // and writes nothing until it is answered (2026-11-12). "Just this one"
    // binds the face clicked.
    await page.mouse.move(face1.x, face1.y, { steps: 3 });
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForSelector("#an-offer.an__offer--on", { timeout: 5000 }).catch(() => {});
    const offered = await page.evaluate(() => {
      const n = document.querySelector("#an-offer.an__offer--on");
      return { line: n ? (n.querySelector(".an__offer-line") || {}).textContent : null,
        armed: !!window.__sweep.armed, writes: (window.__mockWrites || []).length };
    });
    push("a click on a face with an interrupted like face offers the two as a group, writing nothing, still armed",
      offered.line === "2 like faces on this surface" && offered.armed && offered.writes === before.writes);
    await page.locator('#an-offer [data-offer="one"]').click();
    await page.waitForFunction(() => !window.__sweep.armed, null, { timeout: 5000 }).catch(() => {});
    const bound = await scene();
    const written = await page.evaluate(() => {
      const w = window.__mockWrites[window.__mockWrites.length - 1];
      return (w && (w.event || w.content || w.data || w)) || {};
    });
    const toast = await page.evaluate(() => (document.getElementById("an-toast") || {}).textContent || "");
    // The end's own feature: the dimension's part at the end's node (node a,
    // demo_edge_traced's from end), one face, no direction (v1).
    push("a click binds face 1 at the end's own direction, into the mock's captured writes",
      bound.writes === before.writes + 1 && written.verdict === "bound" &&
      written.feature_key && written.feature_key.part === "demo_triangle" && written.feature_key.node === "a" &&
      (written.geometry_keys || []).map((g) => g.face_id).join() === "1" && !("direction" in written));
    push("the row's state line reads bound, the toast names the write, and the pick disarms",
      bound.line === "bound · face 1" && !bound.filter &&
      /^Bound demo bolt-head bearing face to face 1 of /.test(toast));
    // Sweep mode's own see-through setting ghosts a still part at its usual
    // opacity; what must be gone is the armed pick's faint one.
    push("ending the pick restores the scene and the camera it found",
      bound.bracketOpacity > 0.15 && bound.bracketShown &&
      sameCamera(bound.camera, saved));
    push("the bar offers the way back to the frame the pick moved away from",
      await page.locator(".an__sweep-back button").isVisible());
    await page.locator(".an__sweep-back button").click();
    push("...and it goes there", (await scene()).index === before.index);

    // --- Esc restores ------------------------------------------------------------
    await page.locator(ROW).hover();
    await page.locator(ROW + " > .tree-cands > .tree-cand--other").click();
    await page.waitForFunction(() => window.__sweep.armed, null, { timeout: 5000 });
    const savedAgain = await page.evaluate(() => window.__sweep.armed.restore.camera);
    await page.mouse.move(away.x, away.y);
    await page.keyboard.press("Escape");
    const escaped = await scene();
    push("Esc ends an armed pick and puts the scene and camera back",
      !escaped.armed && !escaped.filter && escaped.bracketOpacity > 0.15 && escaped.bracketShown &&
      sameCamera(escaped.camera, savedAgain) &&
      escaped.writes === before.writes + 1);
    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.close();
  }
}

// --- a rail row with a proposal (a_rail_row_with_a_proposal_says_so_and_
// accepts_it_in_place) ----------------------------------------------------------
//
// ?mock=1, the synthetic crank-slider, as the armed pick suite sets it up (node
// `a` given the demo triangle). An init script adds, as the fixture is read,
// either an agent's open proposal on demo_edge_traced's `from` end (face 0) or
// -- `candidates` -- the contact engine's ranked pairs on that edge and no
// proposal. Writes are the mock adapter's captured list. Then the same rail on
// P2 and the topology-level bind rail over the REAL feature-identity
// projection, counted against the projection read here, off disk.
async function openSuggestionPage(browser, url, mode, errors, extra) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript((mode) => {
    const AA = window.AnnotateApp = window.AnnotateApp || {};
    let fixtures;
    Object.defineProperty(AA, "FIXTURES", {
      configurable: true,
      get() { return fixtures; },
      set(v) {
        const demo = v.topologyProjection.topologies.find((t) => t.id === "demo_system");
        demo.nodes.find((n) => n.id === "a").parts = ["demo_triangle"];
        const key = { kind: "topology_edge", topology_id: "demo_system", edge_id: "demo_edge_traced" };
        if (mode === "proposal") {
          v.featureIdentityProjection.stack_keys.push({
            stack_key: key, state: "proposed", bindings: [], owner_not_in_set: [], superseded: [],
            history: ["proposal-0009-demo_edge_traced-from"],
            proposals: [{
              schema: "joby.tolerance_stack/feature-identity/v0",
              event_id: "proposal-0009-demo_edge_traced-from", seq: 9,
              created_at: "2026-10-29T00:00:00Z",
              recorded_by: "agent:a_rail_row_with_a_proposal_says_so_and_accepts_it_in_place",
              stack_key: key, verdict: "proposed",
              geometry_key: { source_step_sha256: v.demoSha, face_id: 0,
                area_native2: 0.5, centroid_native: [0.33, 0.33, 0] },
              direction: "from", confidence: "high", surface_class: "planar",
              basis: "flat face; the one face of the demo triangle",
            }],
            rejected_proposals: [], accepted_proposals: [],
          });
        } else {
          v.contactSuggestions.topologies.push({ id: "demo_system", edges: [{
            edge: "demo_edge_traced", status: "ok", pairing: "plane_on_plane",
            from: { node: "a" }, to: { node: "b" }, ambiguous_with: [],
            candidates: [1, 2, 3].map((rank) => ({ rank, relation: "contact", score: rank,
              from: { sha256: v.demoSha, surface: "planar", faces: [[1, 0, 2][rank - 1]] },
              to: { sha256: "1".repeat(63), surface: "planar", faces: [0] },
              evidence: {}, box: { min: [0, 0, 0], max: [1, 1, 1] } })),
          }] });
        }
        fixtures = v;
      },
    });
  }, mode);
  await page.goto(url + "?embedded=1&mock=1" + (extra || ""), { waitUntil: "load" });
  return page;
}

// The scene's camera once it has stopped moving: a selection frames with
// damping, so a camera read straight after it is still travelling and a
// before/after comparison would blame whatever ran next (the 2026-10-29
// lesson). Two reads a beat apart that agree, or the last read after 5 s.
// Two camera states the same to well under a micron: a re-render
// recomputes the position in floating point and need not repeat its last digit.
function sameCameraState(a, b) {
  const flat = (c) => (c ? [].concat(c.position || [], c.target || []) : []);
  const x = flat(a);
  const y = flat(b);
  return x.length > 0 && x.length === y.length && x.every((v, i) => Math.abs(v - y[i]) < 1e-6);
}

async function settledCamera(page) {
  let last = null;
  for (let i = 0; i < 25; i++) {
    const now = JSON.stringify(await page.evaluate(() => window.__scene.cameraState()));
    if (now === last) return JSON.parse(now);
    last = now;
    await page.waitForTimeout(200);
  }
  return JSON.parse(last);
}

// --- the rail holds still and takes the face Jeff picked (2026-11-05) -------
//
// Jeff's second walk of the rail, on REAL data, in the shell as he opens it:
// the kinematic study's page, its 3D pane, the rail mirrored in the nav. The
// annotator reads the projections on disk (`binding: "real"`, the agent's
// open proposals included) and writes to the memory adapter, never a folder.
// Bodies live under Bodies (a link is one), a joint row names its two parts
// and lists only its ends, an end's Pick frames the occurrence the run poses,
// and a Take keeps the nav where it was and opens the partner end's list.
async function testAnnotateRailHoldsStill(browser, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const STUDY = "vpa_pitch_linkage_blade_pitch_at_the_stops";
  const kinematic = await readProjection("kinematic/kinematic_studies.json");
  const study = kinematic && (kinematic.studies || []).find((s) => s.id === STUDY);
  const index = await realDataIndexForTheAnnotator();
  const identity = existsSync(join(DATA_REPO, "data", "projections", "feature-identity", "bindings.json"));
  if (!study || !topologies || !identity || index.runs.indexOf(study.sweep.run_id) === -1) {
    push("[real] the rail holds still (skipped: the kinematic, topology or feature-identity " +
      "projection, or the study's run, is not on disk)", true);
    return reportSuite(label, checks, errors);
  }
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  // Short enough that the nav scrolls with the scene's tree in it.
  const page = await browser.newPage({ viewport: { width: 1600, height: 760 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  // Jeff's accepts served unanswered (acceptedOnlyProposals): the Take below
  // needs a joint whose ends are both still open, and since 2026-11-08 he has
  // accepted every end the study lists.
  const unaccept = await acceptedOnlyProposals();
  console.log("    served unanswered: " + (Object.keys(unaccept).join(", ") || "-"));
  await installRealAnnotatorReads(page, { meshes: index.meshes, runs: index.runs,
    aliases: index.aliases, binding: "real", unaccept });
  const inPane = (fn, arg) => page.evaluate(({ src, arg }) => {
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    if (!w || !w.document) return null;
    return new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
  }, { src: fn.toString(), arg });
  // Waits are swallowed and read as a named check's failure, never thrown.
  const until = async (fn, arg, timeout = 30000) => {
    try {
      await page.waitForFunction(({ src, arg }) =>
        !!new Function("arg", "return (" + src + ")(arg);")(arg),
      { src: fn.toString(), arg }, { timeout, polling: 100 });
      return true;
    } catch { return false; }
  };
  // A precondition the Take checks read: a missing one is printed by name and
  // the checks that read it go red -- never thrown, which would abort the suite
  // before they are pushed (and the witness runner would report a guard it
  // never reached).
  const need = async (what, fn, arg, timeout) => {
    if (await until(fn, arg, timeout)) return true;
    console.log(`    MISSING: ${what} (after ${timeout} ms)`);
    return false;
  };
  // The nav's mirrored rows: key, words, state, and where each sits.
  const nav = () => page.evaluate(() => {
    const box = document.getElementById("navtree");
    const top = box.getBoundingClientRect().top;
    return { scrollTop: box.scrollTop, rows: Array.from(document.querySelectorAll(".navtree__scene [data-scene-key]"))
      .map((n) => ({ key: n.getAttribute("data-scene-key"),
        text: (n.querySelector(".navtree__scenename") || n).textContent,
        top: Math.round(n.getBoundingClientRect().top - top),
        on: n.classList.contains("navtree__scenerow--on"),
        attention: n.getAttribute("data-attention") === "true",
        open: (n.querySelector(":scope > .navtree__scenetwisty") || { getAttribute: () => null }).getAttribute("aria-expanded"),
        buttons: Array.from(n.querySelectorAll(":scope > .navtree__sceneacts > .navtree__scenebtn, " +
          ":scope ~ .navtree__featureacts > .navtree__scenebtn")).map((b) => b.textContent) })) };
  });
  const rowOf = (rows, re) => rows.find((r) => re.test(r.key)) || null;
  const click = (key, sel) => page.evaluate(([k, sel]) => {
    const row = Array.from(document.querySelectorAll(".navtree__scene [data-scene-key]"))
      .find((n) => n.getAttribute("data-scene-key") === k);
    const hit = row && (sel ? row.querySelector(sel) : row);
    if (hit) hit.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return !!hit;
  }, [key, sel || null]);
  const listed = (re) => until((src) => Array.from(document.querySelectorAll(".navtree__scene [data-scene-key]"))
    .some((n) => new RegExp(src).test(n.getAttribute("data-scene-key")) && /face=/.test(n.getAttribute("data-scene-key"))),
  re.source);
  // The pitch link's joint row: its words and its Pick's framing are read off
  // it whatever its ends' state. The Take below goes to a joint chosen at run
  // time instead (`takeTarget`), on the projection with Jeff's accepts served
  // unanswered (above): a bound end with no open proposal and no contact face
  // lists nothing to take.
  const JOINT = /^#sweep-tree\/joint=pitch_link$/;
  const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // The first joint in rail order whose two rows are the two ends of one edge,
  // both with no face standing and both listing candidates -- what a Take
  // needs to open the partner end's list (app.js's nextEndToPick). Read off the
  // pane's own rows, so the live projection decides, never a hard-coded name.
  const takeTarget = (w) => {
    const open = [w.AnnotateApp.BINDING_STATES.UNBOUND, w.AnnotateApp.BINDING_STATES.PROPOSED];
    const joints = Array.from(w.document.querySelectorAll('#sweep-tree [data-group="joints"] [data-joint]'));
    for (const j of joints) {
      const ends = Array.from(j.querySelectorAll("li.tree-row[data-edge][data-direction]")).map((li) => ({
        edge: li.dataset.edge, direction: li.dataset.direction, feature: li.dataset.feature,
        open: open.indexOf(li.dataset.state) !== -1, listed: !!li.querySelector(":scope > .tree-cands .tree-cand[data-face]") }));
      const to = ends.find((e) => e.direction === "to");
      const from = ends.find((e) => e.direction === "from");
      if (ends.length === 2 && to && from && to.edge === from.edge &&
        to.open && from.open && to.listed && from.listed) return { joint: j.dataset.joint, edge: to.edge, to, from };
    }
    return { joint: null, seen: joints.map((j) => j.dataset.joint + ": " +
      Array.from(j.querySelectorAll("li.tree-row[data-edge][data-direction]")).map((li) =>
        li.dataset.edge + "/" + li.dataset.direction + "=" + li.dataset.state +
        (li.querySelector(":scope > .tree-cands .tree-cand[data-face]") ? "+listed" : "")).join(" ")) };
  };
  let UPPER = /^$^/, LOWER = /^$^/, TAKE_JOINT = /^$^/, TAKE_EDGE = null;
  try {
    await page.goto(url + "/apps/viewer/topology.html?kinematic=" + STUDY, { waitUntil: "load" });
    await page.waitForSelector("#pane-handle:visible", { timeout: 30000 });
    await page.locator("#pane-handle").click();
    // The pane's own rail has its joints (hidden, embedded); the nav draws
    // the model's tree and, under a selected feature, the pane's rows for it.
    await until(() => {
      const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
      return w && w.document && w.document.querySelectorAll('#sweep-tree [data-group="joints"] [data-joint]').length >= 5;
    }, null, 120000);
    await until(() => {
      const w = document.querySelector("#annotate-flyout iframe").contentWindow;
      return w.__sweep && w.__sweep.occurrences && (w.__sweep.occurrences.pitch_link || []).length > 0;
    }, null, 120000);
    // The faces layer for one node: its part opened, its row clicked.
    const selectFeature = async (part, node) => {
      const twisty = page.locator(`#navtree [data-nav-twisty="p:${part}"]`).first();
      if (await twisty.getAttribute("aria-expanded").catch(() => null) === "false") await twisty.click();
      await page.locator(`#navtree [data-nav-kind="feature"][data-nav-id="${part}@${node}"]`).first().click();
      await until((n) => {
        const row = document.querySelector('#navtree [data-nav-kind="feature"][data-nav-id="' + n + '"]');
        const slot = row && row.parentNode.querySelector(".navtree__scene");
        return !!slot && slot.querySelectorAll("[data-scene-key]").length > 0;
      }, part + "@" + node, 30000);
    };

    // --- the pane's transport moves the page's pose ---------------------------
    // (the_linkage_play_control_is_the_only_one_and_it_moves_everything) One pose,
    // owned by the pane: playing it moves the grid's numbers, the chart's cursor
    // and the angle read-out with the linkage, a pause holds all of them on the
    // frame it stopped on, and a seek lands all of them on that frame.
    {
      const sample = () => page.evaluate(() => {
        const w = document.querySelector("#annotate-flyout iframe").contentWindow;
        const cursor = document.querySelector("#detail line.kmchart__pose");
        return {
          pane: w.__sweep.index,
          angle: document.querySelector("#detail input.kmpose__angle").value,
          cursor: cursor ? Number(cursor.getAttribute("x1")) : null,
          grid: Array.from(document.querySelectorAll("#topogrid td.tvcell--contribution"))
            .slice(0, 8).map((n) => n.textContent).join("|"),
        };
      });
      const exec = (command) => page.evaluate((c) =>
        document.querySelector("#annotate-flyout iframe").contentWindow.AnnotateApp.exec(c), command);
      const angleAt = (i) => page.evaluate((m) => window.ViewerApp.kinematicNumber(
        m, window.ViewerApp.KINEMATIC_POSE.angleDecimals), study.envelope[i].nominal_measure);
      await exec(["pause"]);
      await exec(["seek", "#0"]);
      await page.waitForTimeout(500);
      const rest = await sample();
      await exec(["play"]);
      // Eight readings over ~4 s of play: on a loaded box the page can stall
      // for a beat, so "moves" is several distinct values, not two different ones.
      const played = [];
      for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(500);
        played.push(await sample());
      }
      const b = played[played.length - 1];
      await exec(["pause"]);
      // The page settles on the frame the pane stopped on (a render, which can
      // take a beat on a loaded box): read once three samples agree, then again
      // after a wait. A pane that did not pause never agrees with itself.
      let c = await sample();
      for (let i = 0, still = 0; i < 40 && still < 3; i++) {
        await page.waitForTimeout(400);
        const next = await sample();
        still = JSON.stringify(next) === JSON.stringify(c) ? still + 1 : 0;
        c = next;
      }
      await page.waitForTimeout(900);
      const d = await sample();
      const N = Math.min(5, study.envelope.length - 1);
      await exec(["seek", "#" + N]);
      await page.waitForTimeout(600);
      const e = await sample();
      const want = await angleAt(N);
      console.log("      pane play: " + [rest, ...played, c, d, e].map((x) =>
        `[pane ${Number(x.pane).toFixed(2)} angle ${x.angle} cursor ${x.cursor}]`).join(" "));
      push("[real] playing the pane's own transport moves the page's angle, chart cursor and " +
        "grid numbers with the linkage",
        ["angle", "cursor", "grid", "pane"].every((k) =>
          new Set(played.map((x) => x[k])).size >= 3) && b.angle !== rest.angle);
      push("[real] and a pause in the pane holds the page on the frame it stopped on",
        d.angle === c.angle && d.cursor === c.cursor && d.grid === c.grid && d.pane === c.pane);
      push("[real] and a seek in the pane lands the page's angle on that frame",
        e.angle === want && e.pane === N);
    }

    // --- bodies live under Bodies -------------------------------------------
    const rail = await inPane((w) => ({
      inBodies: Array.from(w.document.querySelectorAll('#sweep-tree [data-group="bodies"] [data-body="pitch_link"] .part-row__label'))
        .filter((n) => /^213862-002/.test(n.textContent)).length,
      anywhere: Array.from(w.document.querySelectorAll("#sweep-tree .part-row__label"))
        .filter((n) => /^213862-002/.test(n.textContent)).length,
      underJoints: w.document.querySelectorAll('#sweep-tree [data-group="joints"] .part-row').length,
    }));
    push("[real] the pitch link assembly 213862-002 is one row, under Bodies in the link's own body " +
      "row, and no joint lists a part",
      rail && rail.inBodies === 1 && rail.anywhere === 1 && rail.underJoints === 0);

    // The rows the nav's faces layer never reaches: the pane's own Bodies list,
    // every part row in it -- one with no installed model included -- says it is
    // a part (railLook), or it has no glyph and no type-filter chip.
    const partKinds = await inPane((w) => Array.from(w.document.querySelectorAll(
      "#sweep-tree [data-group=\"bodies\"] .part-row")).map((r) => ({
      key: r.closest("[data-body]").dataset.body + "/" + r.textContent.trim().slice(0, 40),
      missing: r.classList.contains("part-row--missing"),
      kind: Array.from(r.classList).filter((c) => c.indexOf("rail-kind--") === 0).join(",") })));
    console.log("    part rows without the part kind: " + JSON.stringify((partKinds || [])
      .filter((r) => r.kind !== "rail-kind--part").map((r) => r.key)) + "; with no model: " +
      (partKinds || []).filter((r) => r.missing).length);
    push("[real] every part row under Bodies carries the part kind, a part with no installed model " +
      "included",
      partKinds && partKinds.length > 0 && partKinds.some((r) => r.missing) &&
      partKinds.every((r) => r.kind === "rail-kind--part"));

    // --- a joint row names its parts and lists only its ends ---------------
    // Read off the pane's own rail (the nav no longer mirrors the joints).
    const jointWords = await inPane((w) => {
      const j = w.document.querySelector('#sweep-tree [data-group="joints"] [data-joint="pitch_link"]');
      const text = j && j.querySelector(":scope > summary .an__tree-text, :scope > summary");
      return { text: text ? text.textContent.trim() : null,
        lengths: Array.from(w.document.querySelectorAll('#sweep-tree [data-group="joints"] li.tree-row[data-feature]'))
          .filter((li) => /^(pitch|tan)_link_length$/.test(li.dataset.feature)).length };
    });
    push("[real] the pitch link's joint row names the two parts it joins: 215177-001 ball-ended link 215071-001",
      jointWords && jointWords.text && jointWords.text.indexOf("215177-001 ball-ended link 215071-001") !== -1);
    push("[real] no joint lists the pitch link's or the tangential link's length as a third row",
      jointWords && jointWords.lengths === 0);
    let at = await nav();

    // --- the camera frames the occurrence the run poses -------------------
    await inPane((w) => { w.AnnotateApp.exec(["arm", "pitch_link_length", "to"]); });
    const armed = await until(() => {
      const w = document.querySelector("#annotate-flyout iframe").contentWindow;
      return w.__sweep && w.__sweep.armed;
    }, null, 15000);
    const framed = armed ? await inPane((w) => {
      const s = w.__scene;
      const sha = w.__sweep.armed.shas[0];
      const posed = (w.__sweep.occurrences.pitch_link || []).filter((o) => o.sha256 === sha).map((o) => o.key);
      const mesh = s.parts.get(sha);
      const dist = s._occurrenceNodes(sha).map((node) => ({ key: node.userData.key,
        d: mesh.geometry.boundingBox.clone().applyMatrix4(node.matrix)
          .getCenter(s.camera.position.clone()).distanceTo(s.controls.target) }));
      const mine = dist.filter((x) => posed.indexOf(x.key) !== -1);
      const others = dist.filter((x) => posed.indexOf(x.key) === -1);
      return { posed: posed.length, drawn: dist.length, keys: posed, dist,
        subjects: Object.keys(w.__sweep.occurrences), armedPart: w.__sweep.armed.parts[0].partId,
        near: mine.length === 1 && others.length > 0 && others.every((o) => mine[0].d < o.d) };
    }) : null;
    if (!(framed && framed.near)) console.log('    DIAG framing: armed ' + armed + ' ' + JSON.stringify(framed));
    push("[real] a Pick on the pitch link's end frames the pitch link the run poses (blade 1's), " +
      "not the copies on the other blades",
      framed && framed.posed === 1 && framed.drawn > 1 && framed.near);
    await inPane((w) => { w.AnnotateApp.exec(["arm", "off"]); });
    await until(() => !document.querySelector("#annotate-flyout iframe").contentWindow.__sweep.armed);

    // --- a Take keeps the nav still and opens the partner end -------------
    const target = await inPane(takeTarget);
    console.log("    take target: " + JSON.stringify(target));
    if (target && target.joint) {
      const end = (e) => new RegExp("^#sweep-tree/joint=" + reEsc(target.joint) + "/direction=" + e.direction +
        ",edge=" + reEsc(e.edge) + ",feature=" + reEsc(e.feature));
      UPPER = end(target.to);
      LOWER = end(target.from);
      TAKE_JOINT = new RegExp("^#sweep-tree/joint=" + reEsc(target.joint) + "$");
      TAKE_EDGE = target.edge;
    }
    // No such joint is the Take check's failure (`!!take` below), logged above.
    // The end to take is a node: its feature row in the tree is selected, and
    // the faces layer under it is the pane's row for that end.
    // The end's node is a feature of its first-listed part (the model view's
    // rule for a gap end), read off the projection.
    const toPartId = target && target.to ? (topologies.topologies.find((t) => t.id === study.topology)
      .nodes.find((n) => n.id === target.to.feature) || { parts: [] }).parts[0] : null;
    const takeFeatureSel = target && target.to
      ? `#navtree [data-nav-kind="feature"][data-nav-id="${toPartId}@${target.to.feature}"]` : null;
    if (takeFeatureSel) await selectFeature(toPartId, target.to.feature).catch(() => {});
    at = await nav();
    // The end's list is under the feature row with no disclosure of its own
    // (2026-11-10): its faces are there as soon as the row is open.
    await listed(UPPER);
    // The Take is on the end's face row once the end's candidates are drawn: wait
    // for the button, not for the clock.
    if (target && target.joint) {
      await need("a Take button on a listed face of the end to take", (src) =>
        Array.from(document.querySelectorAll(".navtree__scene [data-scene-key]")).some((n) =>
          new RegExp(src).test(n.getAttribute("data-scene-key")) && /face=/.test(n.getAttribute("data-scene-key")) &&
          Array.from(n.querySelectorAll(":scope > .navtree__sceneacts > .navtree__scenebtn, " +
            ":scope ~ .navtree__featureacts > .navtree__scenebtn")).some((b) => b.textContent === "Take")),
      UPPER.source, 30000);
    }
    // The feature row near the top of the nav, scrolled there by hand.
    await page.evaluate((sel) => {
      const box = document.getElementById("navtree");
      const row = document.querySelector(sel);
      if (row) box.scrollTop += row.getBoundingClientRect().top - box.getBoundingClientRect().top - 60;
    }, takeFeatureSel);
    await page.waitForTimeout(300);
    const before = await nav();
    const take = before.rows.find((r) => UPPER.test(r.key) && /face=/.test(r.key) && r.buttons.indexOf("Take") !== -1);
    if (take) await click(take.key, ".navtree__scenebtn");
    if (take) await need("the Take's event written", () =>
      (document.querySelector("#annotate-flyout iframe").contentWindow.__mockWrites || []).length > 0, null, 30000);
    // The pane selects the partner end next (nextEndToPick); the page follows
    // its selection to that end's node, so the faces layer moves to the
    // partner's feature row, which is brought on screen.
    const partnerNode = target && target.from ? target.from.feature : null;
    // Settled is the whole of what the next check reads: the partner's row
    // selected, its layer drawn beneath it, and the row scrolled on screen.
    if (take && partnerNode) await need("the partner end's feature row selected and on screen with the pane's rows beneath", (node) => {
      const row = document.querySelector('#navtree [data-nav-kind="feature"][data-node-id="' + node + '"].navtree__row--on');
      const slot = row && row.parentNode.querySelector(".navtree__scene");
      const nav = document.getElementById("navtree").getBoundingClientRect();
      const r = row && row.getBoundingClientRect();
      return !!slot && slot.querySelectorAll('[data-scene-key*="feature=' + node + '"]').length > 0 &&
        r.top >= nav.top - 1 && r.bottom <= nav.bottom + 1;
    }, partnerNode, 20000);
    const followed = await page.evaluate((node) => {
      const row = document.querySelector('#navtree [data-nav-kind="feature"][data-node-id="' + node + '"].navtree__row--on');
      const slot = row && row.parentNode.querySelector(".navtree__scene");
      const nav = document.getElementById("navtree").getBoundingClientRect();
      const r = row && row.getBoundingClientRect();
      return { on: !!row,
        layer: !!slot && slot.querySelectorAll('[data-scene-key*="feature=' + node + '"]').length > 0,
        visible: !!r && r.top >= nav.top - 1 && r.bottom <= nav.bottom + 1 };
    }, partnerNode);
    push("[real] after a Take the faces layer follows the partner end: its feature row is selected " +
      "and on screen, with the pane's row for it beneath",
      !!take && followed.on && followed.layer && followed.visible);
    // The partner end opens and is selected in the pane's own rail (the nav
    // shows the selected feature's end alone).
    if (take) await need("the partner end selected in the pane with its candidate faces listed", (args) => {
      const w = document.querySelector("#annotate-flyout iframe").contentWindow;
      const li = Array.from(w.document.querySelectorAll('#sweep-tree li.tree-row[data-edge][data-direction]'))
        .find((n) => n.dataset.edge === args.edge && n.dataset.direction === args.direction);
      return !!li && li.classList.contains("selected") && li.querySelectorAll(":scope > .tree-cands .tree-cand[data-face]").length > 0;
    }, { edge: TAKE_EDGE, direction: target && target.from ? target.from.direction : "from" }, 15000);
    const partner = await inPane((w, args) => {
      const li = Array.from(w.document.querySelectorAll('#sweep-tree li.tree-row[data-edge][data-direction]'))
        .find((n) => n.dataset.edge === args.edge && n.dataset.direction === args.direction);
      if (!li) return null;
      return { selected: li.classList.contains("selected"), twisty: !!li.querySelector(":scope > .tree-row__twisty"),
        faces: li.querySelectorAll(":scope > .tree-cands .tree-cand[data-face]").length, state: li.dataset.state,
        edgeRows: w.document.querySelectorAll('#sweep-tree li.tree-row[data-feature="' + args.edge + '"]').length };
    }, { edge: TAKE_EDGE, direction: target && target.from ? target.from.direction : "from" });
    const stillSweep = await inPane((w) => !!w.__sweep && !w.__sweep.armed && !!w.document.getElementById("sweep-tree"));
    push("[real] after one end is taken the other end is selected with its candidate faces listed " +
      "under it (no disclosure of its own), still suggested, and no edge-feature row is listed",
      !!take && partner && !partner.twisty && partner.selected && partner.faces > 0 &&
      partner.state !== "bound" && partner.edgeRows === 0 && stillSweep);

    // --- the rail reads as a tree (the_rail_reads_as_a_tree_of_bodies_
    // joints_and_faces) ------------------------------------------------------
    // What Jeff reads: each row says what it is and what state it is in, the
    // legend names the states, the levels step in, and no state recolours a
    // row's words. Read off the shell's tree, from the annotator's words, on
    // the live study -- not from rows a test built by hand.
    // The look is read on the PARTNER end, where the layer followed: it is
    // still suggested, so its body is the pane's rows, its candidate list
    // under it. (Until 2026-11-12 it was read on the taken end; a bound
    // feature's body is now the one bound line -- a_binding_shows_the_moment_
    // it_is_made_and_is_corrected_where_it_is_shown -- read after this.)
    at = await nav();
    await listed(LOWER);
    await page.waitForTimeout(500);
    // The layer is read under whichever feature holds it now; none at all is
    // a diagnosis, not an abort.
    const layerState = await page.evaluate(() => ({
      slots: document.querySelectorAll(".navtree__scene").length,
      on: Array.from(document.querySelectorAll("#navtree .navtree__row--on")).map((n) => n.getAttribute("data-nav-id")),
      selected: window.ViewerApp.lastTopoRender && window.ViewerApp.lastTopoRender.selection }));
    if (!layerState.slots) console.log("    DIAG no faces layer after the Take: " + JSON.stringify(layerState));
    const look = await page.evaluate(({ upper, lower, joint }) => {
      const w = document.querySelector("#annotate-flyout iframe").contentWindow;
      const scene = document.querySelector(".navtree__scene");
      if (!scene) return { kinds: [], unkinded: [], endMarks: [], marks: [], legend: [], step: [null], glyphs: [null], attentionInk: null, ink: "a", inferred: "b" };
      // The faces layer's rows: the END is the feature body's state line
      // (one_selection_one_hover_and_leaders_off: the pane's own row for the
      // feature is not drawn; the feature row above is the title and wears
      // the one mark), the faces are scene rows under it.
      const rows = Array.from(scene.querySelectorAll(
        ".navtree__scenerow[data-scene-key], .navtree__featurestate[data-scene-key]"));
      const find = (re, kind) => rows.find((n) => new RegExp(re).test(n.getAttribute("data-scene-key")) &&
        n.getAttribute("data-kind") === kind);
      const featureRow = scene.parentNode.querySelector(":scope > .navtree__row--feature");
      const lead = (n) => n && n.firstElementChild ? n.firstElementChild.getBoundingClientRect().left : NaN;
      // A glyph is drawn by a ::before (the scene rows' marks) or by the mark's
      // own box (the feature row's one mark, a filled or ringed circle).
      const glyph = (n) => {
        const mark = n && (n.querySelector(":scope > .navtree__scenemark") || n.querySelector(":scope > .navtree__mark"));
        if (!mark) return null;
        const s = getComputedStyle(mark, "::before");
        const own = getComputedStyle(mark);
        const box = mark.getBoundingClientRect();
        const byBox = s.content === "none" && box.width > 0 &&
          (own.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(own.borderTopWidth) > 0);
        return { content: byBox ? "box" : s.content, width: byBox ? box.width : (parseFloat(s.width) || 0),
          fill: s.content === "none" ? own.backgroundColor : s.backgroundColor };
      };
      const probe = (css) => {
        const p = document.createElement("span");
        p.style.color = css;
        scene.appendChild(p);
        const c = getComputedStyle(p).color;
        p.remove();
        return c;
      };
      const up = find(upper, "end");
      const low = find(lower, "end");
      const jointRow = null;
      const candidate = rows.find((n) => n.getAttribute("data-kind") === "candidate" &&
        n.getBoundingClientRect().height > 0);
      // A state the annotator calls attention, on a row on screen: its words
      // stay ink (the old rule painted them --inferred; Jeff's "turned orange").
      // Read on the flagged row's OWN words -- a candidate face row; the end's
      // state line is drawn in its state's colour by design -- so a rule that
      // recolours a flagged row is seen (until 2026-11-12 it flagged the end
      // and read the feature row's label, which no row rule reaches, and its
      // witness could not see the difference).
      let attentionInk = null;
      if (candidate) {
        const words = candidate.querySelector(".navtree__scenename") || candidate;
        candidate.setAttribute("data-attention", "true");
        attentionInk = getComputedStyle(words).color;
        candidate.removeAttribute("data-attention");
      }
      const marks = Object.keys(w.AnnotateApp.RAIL_MARKS);
      return {
        kinds: Array.from(new Set(rows.map((n) => n.getAttribute("data-kind")))),
        unkinded: rows.filter((n) => !n.getAttribute("data-kind")).map((n) => n.getAttribute("data-scene-key")),
        endMarks: rows.filter((n) => n.getAttribute("data-kind") === "end").map((n) => n.getAttribute("data-mark")),
        marks,
        upperMark: up && up.getAttribute("data-mark"),
        lowerMark: low && low.getAttribute("data-mark"),
        // The feature row's one mark, and what the tree says it is.
        featureStatus: featureRow && featureRow.querySelector(".navtree__mark") &&
          featureRow.querySelector(".navtree__mark").getAttribute("data-status"),
        featureFill: glyph(featureRow) && glyph(featureRow).fill,
        bound: probe("var(--mark-bound)"),
        legend: Array.from(scene.querySelectorAll(".navtree__scenelegenditem")).length,
        titles: Array.from(scene.querySelectorAll(".navtree__scenename, .navtree__featurewords"))
          .map((n) => n.textContent),
        featureName: featureRow ? featureRow.querySelector(".navtree__label").textContent : null,
        step: [lead(candidate) - lead(featureRow)].map((d) => (isNaN(d) ? null : d)),
        glyphs: [glyph(featureRow), glyph(rows.find((n) => n.getAttribute("data-kind") === "candidate"))],
        attentionInk,
        ink: probe("var(--ink)"),
        inferred: probe("var(--inferred)"),
      };
    }, { upper: UPPER.source, lower: LOWER.source, joint: TAKE_JOINT.source });
    console.log(`    rail look: kinds ${look.kinds.join(" ")}; ends ${look.endMarks.join(" ")}; ` +
      `legend items ${look.legend}; steps ${look.step.join(" ")}; ` +
      `feature mark ${look.featureStatus} ${look.featureFill} (bound ${look.bound}); attention ink ${look.attentionInk} ` +
      `(ink ${look.ink}, inferred ${look.inferred}); unkinded ${look.unkinded.length}; ` +
      `glyphs ${JSON.stringify(look.glyphs.map((g) => g && [g.content, g.width]))}; titles ${JSON.stringify(look.titles)}`);
    push("[real] the faces layer's rows say what they are: the end's state line and the candidate rows " +
      "each carry their kind, and every end carries a mark from the annotator's vocabulary",
      ["end", "candidate"].every((k) => look.kinds.indexOf(k) !== -1) &&
      look.unkinded.length === 0 && look.endMarks.length >= 1 &&
      look.endMarks.every((m) => look.marks.indexOf(m) !== -1));
    // The TAKEN end, re-selected: its body is the bound line naming the face
    // just taken (the picked-now mark on the pane's row retired with that
    // row, 2026-11-12), and the feature row's one mark reads bound, filled in
    // the bound colour.
    const takenFace = await inPane((w) => {
      const last = (w.__mockWrites || []).slice(-1)[0];
      // A feature-keyed event (2026-11-12) lists its faces; the face taken is the first.
      const face = last && last.event && ((last.event.geometry_keys || [])[0] || last.event.geometry_key);
      return face ? face.face_id : null;
    });
    if (takeFeatureSel) await selectFeature(toPartId, target.to.feature).catch(() => {});
    if (take) await need("the taken end's body reading bound", (sel) => {
      const row = document.querySelector(sel);
      return !!(row && row.parentNode.querySelector('.navtree__featurebody[data-body-kind="bound"]'));
    }, takeFeatureSel, 15000);
    const taken = await page.evaluate((sel) => {
      const row = document.querySelector(sel);
      const body = row && row.parentNode.querySelector(".navtree__featurebody");
      const mark = row && row.querySelector(".navtree__mark");
      const probe = document.createElement("span");
      probe.style.color = "var(--mark-bound)";
      document.body.appendChild(probe);
      const bound = getComputedStyle(probe).color;
      probe.remove();
      return { kind: body && body.getAttribute("data-body-kind"),
        line: body ? (body.querySelector(".navtree__featurewords") || {}).textContent || "" : "",
        status: mark && mark.getAttribute("data-status"),
        fill: mark && getComputedStyle(mark).backgroundColor, bound };
    }, takeFeatureSel);
    console.log(`    taken end: face ${takenFace}; ${JSON.stringify(taken)}`);
    push("[real] the end taken this session reads bound in its body, naming the face just taken, and the " +
      "feature row's one mark reads bound, filled in the bound colour",
      takenFace !== null && taken.kind === "bound" &&
      new RegExp("^bound \\u00b7 face " + takenFace + " of ").test(taken.line) &&
      taken.status === "bound" && taken.fill === taken.bound);
    // The feature row is the one title: the body under it repeats neither the
    // feature's name nor the marks legend (Jeff, 2026-11-10).
    push("[real] the feature row is the one title: its body repeats neither its name nor a marks legend",
      look.legend === 0 && !!look.featureName &&
      look.titles.every((t) => t.trim() !== look.featureName.trim()));
    // The step Jeff called "way too shallow" was 14px; a level steps in by at
    // least this much, from the feature row to its candidate face.
    const RAIL_MIN_STEP = 18;
    push("[real] a candidate face steps in from its feature row by a full indent",
      look.step.every((d) => d !== null && d >= RAIL_MIN_STEP));
    // A whole glyph, not a speck: the feature row read here is a suggested
    // one, whose mark is a ring, and a ring collapsed to no width still
    // draws its two borders (3px). Both glyphs are drawn at 7-8px.
    const RAIL_MIN_GLYPH = 6;
    push("[real] the feature row and a candidate face each draw a glyph",
      look.glyphs.every((g) => g && g.content !== "none" && g.width >= RAIL_MIN_GLYPH));
    push("[real] a row the annotator marks for attention keeps its words in ink, not the provenance amber",
      look.attentionInk === look.ink && look.ink !== look.inferred);

    // (The pressed-Isolate one-line check left with the mirrored part rows,
    // 2026-11-10: the tree's part rows carry a show/hide box and no buttons.)

    push("[real] nothing above produced an uncaught error", errors.length === 0);
    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.closeAllConnections();
    server.close();
  }
}

async function testAnnotateRailSuggestion(browser, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}/apps/annotate/index.html`;
  const ROW = '#sweep-tree .tree-row[data-feature="a"]';
  const BRACKET = "1".repeat(63);
  const enterSweep = async (page) => {
    await page.waitForSelector("#element-list li.el-row", { timeout: 15000 });
    await page.evaluate(() => window.AnnotateApp.exec(["sweep", "synthetic-demo-sweep"]));
    await page.waitForFunction(() => window.__sweep && document.getElementById("sweep-tree") &&
      window.__scene.listOpenParts().length > 0, null, { timeout: 15000 });
    await page.evaluate((b) => window.AnnotateApp.exec(["show", b]), BRACKET);
    await page.evaluate(() => { document.querySelector('#sweep-tree [data-joint="pitch_link"]').open = true; });
    await page.waitForSelector(ROW, { timeout: 5000 });
  };
  const read = (page) => page.evaluate(([sel, bracket]) => {
    const s = window.__scene;
    const sha = window.AnnotateApp.FIXTURES.demoSha;
    const li = document.querySelector(sel);
    const line = li && li.querySelector(".tree-row__face");
    const mesh = s.parts.get(sha);
    const centre = mesh ? mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix)
      .getCenter(s.camera.position.clone()) : null;
    return {
      line: line ? line.textContent : null,
      suggestedColour: !!(line && line.classList.contains("tree-row__face--suggested")),
      title: li ? li.title : "",
      buttons: li ? Array.from(li.querySelectorAll(":scope > button")).map((b) => b.textContent) : [],
      // The one pick action: the last row of the end's list, in one wording.
      action: (() => {
        const a = li && li.querySelector(":scope > .tree-cands > .tree-cand--other");
        return a ? { text: a.textContent, pressed: a.getAttribute("aria-pressed") === "true",
          last: a === li.querySelector(":scope > .tree-cands").lastElementChild } : null;
      })(),
      selected: !!(li && li.classList.contains("selected")),
      focus: s.suggestionFocus(),
      drawn: mesh ? s.drawnPlacements(sha).length : 0,
      bracketGhost: s.isGhosted(bracket), triangleGhost: s.isGhosted(sha), bracketLook: s.lookOf(bracket),
      triangleLook: s.lookOf(sha),
      targetToPart: centre ? centre.distanceTo(s.controls.target) : null,
      armed: !!(window.__sweep && window.__sweep.armed),
      writes: (window.__mockWrites || []).map((w) => ({ filename: w.filename, event: w.event })),
    };
  }, [ROW, BRACKET]);

  // --- 1. the row says so, and selecting it lights the face -------------------
  let page = await openSuggestionPage(browser, url, "proposal", errors);
  try {
    await enterSweep(page);
    const rest = await read(page);
    push("a joint end with an open proposal reads 'suggested · high' in the suggestion colour, " +
      "with who and why on the hover, no button until it is selected, and the one pick action last in its list",
      rest.line === "suggested · high" && rest.suggestedColour &&
      rest.title.indexOf("Proposed by agent (high): flat face; the one face of the demo triangle") !== -1 &&
      rest.buttons.length === 0 && !/proposal|ratif|[0-9a-f]{12}/.test(rest.line) &&
      rest.action && rest.action.text === "Pick a face\u2026" && rest.action.last && !rest.action.pressed);
    // The row holds its list now: the row's own click is on its text.
    await page.locator(ROW + " > .tree-row__text").click();
    await page.waitForFunction(() => window.__scene.suggestionFocus().faces.length > 0, null,
      { timeout: 5000 }).catch(() => {});
    await page.waitForFunction(() => window.__scene.suggestionFocus().markerEmphasised, null,
      { timeout: 15000 }).catch(() => {});
    const lit = await read(page);
    push("selecting the row draws the proposed face SOLID on every occurrence of its part",
      lit.selected && lit.focus.solid && lit.focus.faces.length === 1 &&
      lit.focus.faces[0].faceId === 0 && lit.focus.faces[0].drawn === lit.drawn && lit.drawn > 0);
    // Nothing goes opaque (2026-11-12): the part keeps its resting look -- the
    // face is the solid thing -- and every other part goes faint.
    push("...frames the camera on it, keeps its part at its resting look (never opaque), dims every other part, and emphasises the node's hollow marker",
      lit.targetToPart !== null && lit.targetToPart < 0.5 &&
      lit.bracketLook === "faint" && lit.triangleLook === "ghost" && lit.triangleGhost &&
      lit.focus.node === "a" && lit.focus.markerEmphasised);
    push("the selected row offers Accept and nothing else; the pick action stays where it was, under the list",
      JSON.stringify(lit.buttons) === JSON.stringify(["Accept"]) &&
      lit.action && lit.action.text === "Pick a face\u2026" && lit.action.last);
    await page.locator(ROW + " .tree-row__accept").click();
    await page.waitForFunction(() => (window.__mockWrites || []).length > 0, null, { timeout: 5000 }).catch(() => {});
    await page.waitForFunction((sel) => {
      const n = document.querySelector(sel + " .tree-row__face");
      return n && /^bound/.test(n.textContent);
    }, ROW, { timeout: 5000 }).catch(() => {});
    const accepted = await read(page);
    const e = (accepted.writes[0] || {}).event || {};
    push("Accept writes one `bound` event that ratifies the proposal, at its end and face, as the reviewer",
      accepted.writes.length === 1 && e.verdict === "bound" &&
      e.ratifies === "proposal-0009-demo_edge_traced-from" && e.direction === "from" &&
      e.geometry_key.face_id === 0 && e.recorded_by === "annotate-app:jeff" &&
      /_accepted\.json$/.test(accepted.writes[0].filename));
    push("...the row reads bound, the solid face and the dimming come down, and the one pick action " +
      "is still there in the same words",
      accepted.line === "bound · face 0" && !accepted.suggestedColour &&
      !accepted.focus.faces.length && accepted.bracketLook === rest.bracketLook &&
      accepted.buttons.length === 0 && accepted.action && accepted.action.text === "Pick a face\u2026");
  } catch (err) {
    await page.close();
    server.close();
    return reportAbortedSuite(label, checks, errors, err);
  }
  await page.close();

  // --- 2. pick a different face: rejected, then bound, in one click -----------
  page = await openSuggestionPage(browser, url, "proposal", errors);
  try {
    await enterSweep(page);
    // The row holds its list now: the row's own click is on its text.
    await page.locator(ROW + " > .tree-row__text").click();
    await page.waitForFunction(() => window.__scene.suggestionFocus().faces.length > 0, null, { timeout: 5000 });
    await page.locator(ROW + " > .tree-cands > .tree-cand--other").click();
    await page.waitForFunction(() => window.__sweep.armed && window.__scene.pickFilter(), null, { timeout: 5000 });
    const armed = await read(page);
    push("the pick action under a proposal arms the pick, the selected face's fill goes, and the " +
      "same row now reads Cancel, pressed",
      armed.armed && armed.line === "at the as-modelled pose for picking" && !armed.focus.faces.length &&
      armed.action && armed.action.text === "Cancel" && armed.action.pressed);
    await page.evaluate(() => window.__scene.onPick(
      { sha256: window.AnnotateApp.FIXTURES.demoSha, faceId: 1 }, null, null));
    // The demo's two faces are like faces that do not touch: the click offers
    // the group first, and "Just this one" binds the face clicked.
    await page.waitForSelector("#an-offer.an__offer--on", { timeout: 5000 }).catch(() => {});
    await page.locator('#an-offer [data-offer="one"]').click();
    await page.waitForFunction(() => (window.__mockWrites || []).length >= 2 && !window.__sweep.armed,
      null, { timeout: 5000 }).catch(() => {});
    const answered = await read(page);
    const [r, b] = answered.writes.map((w) => w.event);
    // The bound event is the end's feature's (v1): node a on the demo
    // triangle, the one face, no direction.
    push("the face then clicked writes `rejected` for the proposal and then `bound` for that face, " +
      "both as the reviewer, numbered in that order",
      answered.writes.length === 2 && r && b && r.verdict === "rejected" &&
      r.rejects === "proposal-0009-demo_edge_traced-from" && b.verdict === "bound" &&
      b.feature_key && b.feature_key.part === "demo_triangle" && b.feature_key.node === "a" &&
      (b.geometry_keys || []).map((g) => g.face_id).join() === "1" && !("direction" in b) && !b.ratifies &&
      r.recorded_by === "annotate-app:jeff" && b.recorded_by === "annotate-app:jeff" &&
      b.seq === r.seq + 1 && /_rejected\.json$/.test(answered.writes[0].filename) &&
      answered.writes[0].filename < answered.writes[1].filename);
    push("...and the end reads bound to the face picked, with the suggestion gone",
      answered.line === "bound · face 1" && !answered.suggestedColour);
  } catch (err) {
    await page.close();
    server.close();
    return reportAbortedSuite(label, checks, errors, err);
  }
  await page.close();

  // --- 3. ranked, never proposed: candidates, dashed --------------------------
  page = await openSuggestionPage(browser, url, "candidates", errors);
  try {
    await enterSweep(page);
    const rest = await read(page);
    push("an end the contact engine ranked and nobody proposed reads 'candidates · 3', wears no button, " +
      "and ends its list in the same pick action",
      rest.line === "candidates · 3" && rest.suggestedColour &&
      rest.buttons.length === 0 && rest.action && rest.action.text === "Pick a face\u2026" && rest.action.last);
    // The row holds its list now: the row's own click is on its text.
    await page.locator(ROW + " > .tree-row__text").click();
    await page.waitForFunction(() => window.__scene.suggestionFocus().faces.length > 0, null,
      { timeout: 5000 }).catch(() => {});
    const lit = await read(page);
    push("selecting it outlines the top-ranked face at this end, dashed, not filled",
      !lit.focus.solid && lit.focus.faces.length === 1 && lit.focus.faces[0].faceId === 1 &&
      lit.focus.faces[0].drawn > 0 && lit.focus.node === null);

    // a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there: the
    // end's list is under it (the shell's feature row is the disclosure since
    // 2026-11-10; this rail has none); a row's hover washes its face; Take
    // binds it.
    await page.waitForSelector(ROW + " .tree-cands .tree-cand", { timeout: 5000 });
    const list = await page.evaluate((sel) => Array.from(
      document.querySelectorAll(sel + " .tree-cands > li")).map((li) => ({
      name: (li.querySelector(".tree-row__name") || {}).textContent || "",
      reason: (li.querySelector(".tree-row__face") || {}).textContent || "",
      title: li.title, take: !!li.querySelector(".tree-cand__take") })), ROW);
    push("the end's candidate list is under it: one row per face in rank order, each saying " +
      "why it is there, then the one pick action",
      list.length === 4 && list.slice(0, 3).map((r) => r.name).join() === "face 1 · flat,face 0 · flat,face 2 · flat" &&
      list.slice(0, 3).every((r) => r.reason === "coincident with the mating face" && r.take &&
        r.title.indexOf("coincident with the mating face") !== -1) &&
      list[3].name === "Pick a face\u2026" && !list[3].take);
    const cam = await settledCamera(page);
    await page.locator(ROW + ' .tree-cand[data-face="0"]').hover();
    await page.waitForFunction(() => window.__scene.washed(), null, { timeout: 5000 }).catch(() => {});
    const washed = await page.evaluate(() => ({ w: window.__scene.washed(), cam: window.__scene.cameraState() }));
    push("hovering a candidate row washes that face in the pre-selection's yellow, on every drawn " +
      "occurrence, and the camera stays",
      washed.w && washed.w.faceId === 0 && washed.w.overlays > 0 &&
      washed.w.color === washed.w.preselectColor && washed.w.opacity === washed.w.preselectOpacity &&
      sameCameraState(washed.cam, cam));
    await page.mouse.move(5, 5);
    await page.waitForFunction(() => !window.__scene.washed(), null, { timeout: 5000 }).catch(() => {});
    push("...and leaving the list takes the wash down", await page.evaluate(() => !window.__scene.washed()));
    await page.locator(ROW + ' .tree-cand[data-face="0"]').hover();
    await page.locator(ROW + ' .tree-cand[data-face="0"] .tree-cand__take').click();
    await page.waitForFunction(() => (window.__mockWrites || []).length > 0, null, { timeout: 5000 }).catch(() => {});
    await page.waitForFunction((sel) => {
      const n = document.querySelector(sel + " > .tree-row__text > .tree-row__face");
      return n && /^bound/.test(n.textContent);
    }, ROW, { timeout: 5000 }).catch(() => {});
    const taken = await read(page);
    const te = (taken.writes[0] || {}).event || {};
    push("Take writes one `bound` event for that face at that end, as the reviewer, and the row " +
      "reads bound · face N",
      taken.writes.length === 1 && te.verdict === "bound" &&
      te.feature_key && te.feature_key.part === "demo_triangle" && te.feature_key.node === "a" &&
      (te.geometry_keys || []).map((g) => g.face_id).join() === "0" && !("direction" in te) &&
      !te.ratifies && te.recorded_by === "annotate-app:jeff" &&
      taken.line === "bound · face 0");
  } catch (err) {
    await page.close();
    server.close();
    return reportAbortedSuite(label, checks, errors, err);
  }
  await page.close();

  // --- 4. the shell's mirror ----------------------------------------------------
  // The pane posts its rail to the page that embeds it; a page of this origin
  // hosting it in an iframe receives the same message the shell does.
  page = await openSuggestionPage(browser, url, "proposal", errors);
  try {
    await page.waitForSelector("#element-list li.el-row", { timeout: 15000 });
    await page.evaluate((src) => {
      window.__trees = [];
      window.addEventListener("message", (ev) => {
        if (ev.data && ev.data.type === "annotate:tree") window.__trees.push(ev.data);
      });
      const frame = document.createElement("iframe");
      frame.style.cssText = "width:800px;height:600px";
      frame.src = src;
      document.body.appendChild(frame);
    }, url + "?embedded=1&mock=1&embedded=1");
    // The CHILD frame: the page itself was opened with `?embedded=1` too, and
    // the main frame matched first until 2026-11-11 -- so the sweep below ran
    // in the outer page, whose rail posts to nobody, and every tree this
    // check read was the iframe's boot tree in bind mode.
    let inner = null;
    for (let i = 0; i < 100 && !inner; i++) {
      inner = page.frames().find((f) => f !== page.mainFrame() && f.url().indexOf("embedded=1") !== -1) || null;
      if (!inner) await page.waitForTimeout(100);
    }
    await inner.waitForFunction(() => window.AnnotateApp && window.AnnotateApp.exec &&
      document.querySelector("#element-list li.el-row"), null, { timeout: 15000 });
    await inner.evaluate(() => window.AnnotateApp.exec(["sweep", "synthetic-demo-sweep"]));
    await inner.waitForFunction(() => window.__sweep && document.getElementById("sweep-tree"), null,
      { timeout: 15000 });
    await inner.evaluate(() => { document.querySelector('#sweep-tree [data-joint="pitch_link"]').open = true; });
    await page.waitForFunction(() => {
      const find = (rows) => (rows || []).some((r) => (r.key || "").indexOf("#sweep-tree/") === 0 && r.sub === "suggested · high" || find(r.rows));
      return window.__trees.some((t) => find(t.rows));
    }, null, { timeout: 60000 }).catch(() => {});
    const row = await page.evaluate(() => {
      const find = (rows) => {
        for (const r of rows || []) {
          if ((r.key || "").indexOf("#sweep-tree/") === 0 && r.sub === "suggested · high") return r;
          const k = find(r.rows);
          if (k) return k;
        }
        return null;
      };
      for (let i = window.__trees.length - 1; i >= 0; i--) {
        const hit = find(window.__trees[i].rows);
        if (hit) return hit;
      }
      return null;
    });
    push("the shell's mirror carries the row's suggestion line, marked as a suggestion, " +
      "selectable, and not amber", row && row.suggestion === true && row.activate === true &&
      !row.attention);
    // The candidate list crosses the seam with the row, always (since
    // 2026-11-10 the end has no disclosure of its own; the shell's feature
    // row is the disclosure): the row carries no twisty, and its rows are the
    // list's -- each face with its reason and its Take, and the one pick
    // action last.
    // The sweep end's list has no head; bind mode's element row (if that is
    // the row found) names the end above its faces.
    const heads = ((row && row.rows) || []).filter((r) => typeof r.head === "string");
    const kids = ((row && row.rows) || []).filter((r) => typeof r.head !== "string");
    const last = kids[kids.length - 1];
    const mirrorOk = row && typeof row.twisty !== "string" && kids.length >= 2 && heads.length <= 1 &&
      kids[0].sub === "agent suggested \u00b7 high" && kids[0].wrap === true &&
      JSON.stringify((kids[0].buttons || []).map((b) => b.text)) === JSON.stringify(["Take"]) &&
      last.text === "Pick a face\u2026" && last.activate === true && last.kind === "action";
    if (!mirrorOk) {
      const trees = await page.evaluate(() => {
        const flat = (rows, out) => { (rows || []).forEach((r) => { out.push([r.key, r.sub || null, r.kind || null]); flat(r.rows, out); }); return out; };
        const last = window.__trees[window.__trees.length - 1];
        return { count: window.__trees.length, mode: last && last.mode, rows: last ? flat(last.rows, []).slice(0, 40) : null };
      });
      console.log("    DIAG mirrored end row: " + JSON.stringify(row).slice(0, 900));
      console.log("    DIAG last tree: " + JSON.stringify(trees).slice(0, 2500));
    }
    push("...with its candidate list in the same tree, no disclosure of its own: the proposal's " +
      "reason, its Take, and the one pick action last, wrapping", mirrorOk);
  } catch (err) {
    await page.close();
    server.close();
    return reportAbortedSuite(label, checks, errors, err);
  }
  await page.close();

  // --- 5. the real projection: every open proposal reachable ------------------
  const kinematic = await readProjection("kinematic/kinematic_studies.json");
  const study = kinematic && (kinematic.studies || []).find((s) => s.id === SWEEP_RAIL_STUDY);
  const topology = topologies && (topologies.topologies || [])
    .find((t) => study && t.id === study.topology);
  const index = await realDataIndexForTheAnnotator();
  let identity = null;
  try {
    identity = JSON.parse(await readFile(join(DATA_REPO, "data", "projections",
      "feature-identity", "bindings.json"), "utf8"));
  } catch { identity = null; }
  if (!study || !topology || !identity || index.runs.indexOf(SWEEP_RAIL_RUN) === -1) {
    push("[real] the suggestions on the real projection (skipped: the run, the kinematic, the " +
      "topology or the feature-identity projection is not on disk -- build them, or pass --repo " +
      "<main checkout>)", true);
    server.close();
    return reportSuite(label, checks, errors);
  }
  // Open proposals per (edge, end), straight off the projections on disk.
  // Since 2026-11-12 a proposal follows its feature: an end reads the
  // proposals of the feature it is (the dimension's part at the end node, or
  // a gap edge's end node's first part, keyed by the model's `identity`), open
  // where that feature has nothing bound.
  const open = {};
  const featureOf = {};
  for (const f of (topology.model && topology.model.features) || []) featureOf[f.id] = f.identity;
  const firstPart = {};
  for (const n of topology.nodes || []) firstPart[n.id] = (n.parts || [])[0];
  const token = (k) => k && [k.topology_id, k.part, k.node].join("|");
  const recordOf = {};
  for (const r of identity.features || []) recordOf[token(r.feature_key)] = r;
  for (const edge of topology.edges || []) {
    for (const dir of ["from", "to"]) {
      const node = edge[dir];
      const part = edge.kind === "structural" ? edge.part : firstPart[node];
      const r = recordOf[token(featureOf[part + "@" + node] || { topology_id: topology.id, part, node })];
      if (r && !(r.bindings || []).length && (r.proposals || []).length) {
        open[edge.id + "|" + dir] = r.proposals.length;
      }
    }
  }
  const openEdges = new Set(Object.keys(open).map((k) => k.split("|")[0]));
  const openEnds = Object.keys(open).length;
  page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await installRealAnnotatorReads(page, { meshes: index.meshes, runs: index.runs,
    aliases: index.aliases, binding: "real" });
  try {
    await page.goto(`${url}?embedded=1&topology=${topology.id}`, { waitUntil: "load" });
    // The boot draws the FIRST model's rail before the entry's goto lands, and
    // since model v2 (d0863681) that first model is studyless too -- so "a
    // studyless head" was v2's 27 interfaces, not this topology's. Wait for the
    // head that names THIS topology's edge count, and read nothing until then.
    const wantHead = await page.evaluate((n) => window.AnnotateApp.studylessHead(n),
      (topology.edges || []).length);
    await page.waitForFunction((want) => {
      const head = document.querySelector("#element-list li.el-head");
      return !!head && head.textContent === want;
    }, wantHead, { timeout: 60000 }).catch(() => {});
    const bindRail = await page.evaluate(() => ({
      head: (document.querySelector("#element-list li.el-head") || {}).textContent || "",
      shown: Array.from(document.querySelectorAll("#element-list li.el-row .el-row__proposal"))
        .map((n) => n.textContent),
    }));
    console.log(`    topology-level rail ("${bindRail.head}"): ${bindRail.shown.length} rows read ` +
      `suggested; ${topology.id} has ${openEdges.size} edges with ${openEnds} open ends`);
    push("[real] the topology-level rail shows a suggestion on every edge with an open proposal",
      bindRail.head === wantHead && bindRail.shown.length === openEdges.size &&
      bindRail.shown.every((t) => /^suggested · (high|medium|low)$/.test(t)));

    await page.goto(`${url}?embedded=1&sweep=${SWEEP_RAIL_RUN}&kinematic=${SWEEP_RAIL_STUDY}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__sweep && document.getElementById("sweep-tree") &&
      window.__sweep.tree.joints.length > 0, null, { timeout: 180000 });
    const sweepRail = await page.evaluate(() => {
      const out = [];
      for (const n of document.querySelectorAll("#sweep-tree .tree-row[data-feature][data-direction]")) {
        out.push({ edge: n.dataset.edge, dir: n.dataset.direction,
          line: (n.querySelector(".tree-row__face") || {}).textContent || "" });
      }
      return out;
    });
    const expected = sweepRail.filter((r) => open[r.edge + "|" + r.dir]);
    const shown = sweepRail.filter((r) => /^suggested · /.test(r.line));
    console.log(`    kinematic study's joint ends: ${sweepRail.length}, ${shown.length} read suggested, ` +
      `${new Set(shown.map((r) => r.edge + "|" + r.dir)).size} distinct ends of ` +
      `${new Set(shown.map((r) => r.edge)).size} edges`);
    push("[real] on the kinematic study every joint end with an open proposal reads suggested, " +
      "and no other does", expected.length === shown.length &&
      expected.every((r) => /^suggested · /.test(r.line)));
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.close();
  }
  return reportSuite(label, checks, errors);
}

async function testAnnotateSweepRail(browser, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}/apps/annotate/index.html`;
  const railHtml = (page) => page.evaluate(() =>
    document.querySelector(".an__rail").outerHTML.replace(/<!--[\s\S]*?-->/g, ""));

  // --- 1. bind mode is what it was --------------------------------------------
  const mock = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  mock.on("pageerror", (e) => errors.push(String(e)));
  try {
    await mock.goto(url + "?embedded=1&mock=1", { waitUntil: "load" });
    await mock.waitForSelector("#element-list li.el-row", { timeout: 15000 });
    const boot = await railHtml(mock);
    await mock.evaluate(() => window.AnnotateApp.exec(["goto", "demo_system", "demo_edge_untraced"]));
    await mock.waitForTimeout(500);
    const arrived = await railHtml(mock);
    if (WRITE_BIND_RAIL_SNAPSHOT) {
      const kept = JSON.parse(await readFile(BIND_RAIL_SNAPSHOT, "utf8"));
      await writeFile(BIND_RAIL_SNAPSHOT, JSON.stringify(
        Object.assign(kept, { boot, goto: arrived }), null, 1) + "\n", "utf8");
      console.log(`[${label}] wrote ${BIND_RAIL_SNAPSHOT}`);
    }
    const snapshot = JSON.parse(await readFile(BIND_RAIL_SNAPSHOT, "utf8"));
    push("bind mode's rail is node for node the rail before the sweep rail existed, " +
      "at boot and after a goto", boot === snapshot.boot && arrived === snapshot.goto);

    await mock.evaluate(() => window.AnnotateApp.exec(["sweep", "synthetic-demo-sweep"]));
    await mock.waitForFunction(() => window.__sweep && document.getElementById("sweep-tree"),
      null, { timeout: 15000 }).catch(() => {});
    await mock.evaluate(() => window.AnnotateApp.exec(["sweep", "off"]));
    const left = await mock.evaluate(() => ({
      tree: !!document.getElementById("sweep-tree"),
      posture: document.getElementById("workspace").classList.contains("an--sweep"),
      list: getComputedStyle(document.getElementById("element-list")).display !== "none",
    }));
    push("leaving sweep mode takes the whole tree away and puts the bind furniture back",
      !left.tree && !left.posture && left.list);

    // A gap row's badge, on the fixture's own gap row: the witness that does
    // not wait on the live study having an unbanded contributor (it has had
    // none since the_tangential_link_cites_its_drawing).
    await mock.evaluate(() => window.AnnotateApp.exec(["sweep", "synthetic-demo-sweep", "demo_kinematic"]));
    await mock.waitForSelector('#sweep-tree [data-group="contributors"] .tree-row[data-edge="demo_edge_untraced"]',
      { timeout: 15000 }).catch(() => {});
    const demoGap = async (edge) => {
      await mock.locator(`#sweep-tree .tree-row[data-edge="${edge}"] .alertbadge`)
        .hover({ timeout: 3000 }).catch(() => {});
      return mock.evaluate(() => {
        const pop = document.getElementById("alert-pop");
        return pop && pop.style.display !== "none" ? pop.textContent : "";
      });
    };
    const demoPop = await demoGap("demo_edge_untraced");
    const demoBanded = await mock.evaluate(() =>
      !!document.querySelector('#sweep-tree .tree-row[data-edge="demo_edge_traced"]') &&
      !document.querySelector('#sweep-tree .tree-row[data-edge="demo_edge_traced"] .alertbadge'));
    // (Until 2026-11-12 the popup also said what the row's Pick did; the
    // contributor row's Pick is retired.)
    push("a gap contributor's badge opens a popup naming the gap, and a banded one has no badge",
      demoPop.indexOf("No band is cited") !== -1 && demoBanded);
    push("a gap contributor's badge popup names the drawing of its edge's part",
      demoPop.indexOf("DEMO-001") !== -1);
    await mock.evaluate(() => window.AnnotateApp.exec(["sweep", "off"]));
  } catch (err) {
    errors.push(String(err));
  } finally {
    await mock.close();
  }

  // --- 2. P2, opened from the kinematic study --------------------------------
  const kinematic = await readProjection("kinematic/kinematic_studies.json");
  const study = kinematic && (kinematic.studies || []).find((s) => s.id === SWEEP_RAIL_STUDY);
  const topology = topologies && (topologies.topologies || [])
    .find((t) => study && t.id === study.topology);
  const index = await realDataIndexForTheAnnotator();
  if (!study || !topology || index.runs.indexOf(SWEEP_RAIL_RUN) === -1) {
    push("[real] the sweep rail on P2 (skipped: the run, the kinematic or the topology " +
      "projection is not on disk -- build them, or pass --repo <main checkout>)", true);
    server.close();
    return reportSuite(label, checks, errors);
  }
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await installRealAnnotatorReads(page, { meshes: index.meshes, runs: index.runs,
    aliases: index.aliases, contact: true,
    binding: { topology: study.topology, edge: "pitch_link_length",
      faces: [["from", 0], ["to", 1]] } });
  const visible = (selector) => page.evaluate((sel) => {
    const n = document.querySelector(sel);
    return !!n && n.getClientRects().length > 0 && getComputedStyle(n).display !== "none";
  }, selector);
  const headOf = (group) => page.evaluate((g) => {
    const n = document.querySelector(`#sweep-tree [data-group="${g}"] .an__tree-head`);
    return n ? n.textContent : "";
  }, group);
  const contributorEdges = () => page.evaluate(() => [...document.querySelectorAll(
    '#sweep-tree [data-group="contributors"] .tree-row')].map((n) => n.dataset.edge));
  try {
    // Booted on the run the study itself folded, read from the projection,
    // so these checks can never again lean on a run/study mismatch.
    push("[real] the sweep rail boots P2 on the run its kinematic study folded",
      study.sweep && study.sweep.run_id === SWEEP_RAIL_RUN);
    await page.goto(`${url}?embedded=1&sweep=${study.sweep.run_id}&kinematic=${SWEEP_RAIL_STUDY}`, { waitUntil: "load" });
    // The bodies resolving is what opens the parts the synthetic binding sits on.
    await page.waitForFunction(() => window.__sweep && window.__sweep.bodies &&
      window.__sweep.bodies.length > 0 && document.getElementById("sweep-tree"),
      null, { timeout: 180000 }).catch(() => {});

    const furniture = {
      list: await visible("#element-list"), scope: await visible("#rail-filter"),
    };
    push("[real] in sweep mode the rail shows no element list and no scope bar",
      !furniture.list && !furniture.scope);

    const counts = await page.evaluate(() => ({
      bodies: document.querySelectorAll('#sweep-tree [data-group="bodies"] > details').length,
      joints: document.querySelectorAll('#sweep-tree [data-group="joints"] > details').length,
      // A run's links are bodies of their own (2026-11-05, AA.sweepTreeSubjects).
      wantBodies: window.__sweep.artifact.bodies.length + (window.__sweep.artifact.links || []).length,
      wantJoints: Object.keys(window.__sweep.artifact.points[0].joints).length,
      groups: [...document.querySelectorAll("#sweep-tree > [data-group]")].map((n) => n.dataset.group),
    }));
    push("[real] the tree's top level is bodies then joints, with the counts the run carries",
      counts.bodies === counts.wantBodies && counts.joints === counts.wantJoints &&
      counts.wantBodies === 5 && counts.wantJoints === 5 &&
      counts.groups.slice(0, 2).join(",") === "bodies,joints" &&
      (await headOf("bodies")).indexOf("(5)") !== -1 && (await headOf("joints")).indexOf("(5)") !== -1);

    // --- the pitch link: open it, and it is selected ---------------------------
    await page.locator('#sweep-tree [data-joint="pitch_link"] > summary').click({ timeout: 5000 }).catch(() => {});
    await page.waitForFunction(() => window.__scene.sweepEmphasis() === "pitch_link", null,
      { timeout: 5000 }).catch(() => {});
    const features = await page.evaluate(() => {
      const probe = document.createElement("li");
      probe.className = "el-row el-row--bound";
      document.getElementById("element-list").appendChild(probe);
      const bound = getComputedStyle(probe).borderLeftColor;
      probe.remove();
      return { bound, rows: [...document.querySelectorAll('#sweep-tree [data-joint="pitch_link"] .tree-row')]
        .map((n) => ({ id: n.dataset.feature, state: n.dataset.state,
          colour: getComputedStyle(n).borderLeftColor, shown: n.getClientRects().length > 0 })) };
    });
    const spheres = ["pitch_link_upper_sphere_centre", "pitch_link_lower_sphere_centre"]
      .map((id) => features.rows.find((r) => r.id === id));
    push("[real] opening pitch_link lists its two sphere-centre features, coloured as a " +
      "bound element row is",
      spheres.every((r) => r && r.shown && r.state === "bound" && r.colour === features.bound));
    const bead = await page.evaluate(() => ({
      on: window.__scene.sweepEmphasis(),
      scale: window.__scene._sweep.joints.get("pitch_link").scale.x,
      other: window.__scene._sweep.joints.get("tan_link").scale.x,
    }));
    push("[real] opening a joint selects it: its bead is drawn larger than the others",
      bead.on === "pitch_link" && bead.scale > bead.other);

    // --- the contributors follow the frame -----------------------------------
    await page.evaluate(() => window.AnnotateApp.exec(["seek", "#0"]));
    const atLow = { head: await headOf("contributors"), edges: await contributorEdges() };
    push("[real] opened from the kinematic study, six contributor rows read at the −7° " +
      "stop at frame 0",
      atLow.head.indexOf("at the −7° stop") !== -1 && atLow.edges.length === 6);
    await page.evaluate(() => window.AnnotateApp.exec(["seek", "#79"]));
    const atHigh = { head: await headOf("contributors"), edges: await contributorEdges() };
    push("[real] ...and the same six read at the +72° stop at frame 79",
      atHigh.head.indexOf("at the +72° stop") !== -1 && atHigh.edges.length === 6 &&
      atHigh.edges.slice().sort().join() === atLow.edges.slice().sort().join());

    // --- a contributor selected tints its feature's faces ---------------------
    await page.locator('#sweep-tree [data-group="contributors"] .tree-row[data-edge="pitch_link_length"]')
      .click({ timeout: 5000 }).catch(() => {});
    const tint = await page.evaluate(() => {
      const picked = window.__lastInspect;
      if (!picked || !picked.faces.length) return null;
      return picked.faces.map((f) => {
        const mesh = window.__scene.parts.get(f.sha256);
        const at = mesh.userData.faceRanges[f.faceId].start * 3;
        const live = mesh.geometry.attributes.color.array;
        const base = mesh.userData.baseColors;
        return live[at] !== base[at] || live[at + 1] !== base[at + 1] || live[at + 2] !== base[at + 2];
      });
    });
    push("[real] selecting a length contributor tints both of its ends' faces in the " +
      "colour buffer", tint && tint.length === 2 && tint.every(Boolean));
    push("[real] ...and selecting it let the joint go -- one selection at a time",
      await page.evaluate(() => window.__scene.sweepEmphasis() === null));

    // --- the truncation rule, at the rail's narrowest ---------------------------
    await page.evaluate(() => {
      document.getElementById("workspace").style.setProperty("--rail-w",
        window.AnnotateApp.RAIL_WIDTH_MIN + "px");
    });
    const clipped = await page.evaluate(() => {
      const out = { clipped: 0, unreadable: [] };
      const texts = document.querySelectorAll("#sweep-tree .an__tree-text, #sweep-tree .an__tree-head, " +
        "#sweep-tree .tree-row__name, #sweep-tree .part-row__label");
      for (const n of texts) {
        if (!n.getClientRects().length) continue;
        const box = n.classList.contains("an__tree-text") ? n.parentElement : n;
        if (box.scrollWidth <= box.clientWidth) continue;
        out.clipped++;
        let holder = n;
        while (holder && !holder.title) holder = holder.parentElement;
        if (!holder || holder.title.indexOf(n.textContent.trim()) === -1) out.unreadable.push(n.textContent);
      }
      return out;
    });
    push("[real] at the rail's narrowest every clipped tree row carries its whole text " +
      "on hover", clipped.clipped > 0 && clipped.unreadable.length === 0);

    // --- a pick that can show nothing changes nothing ---------------------------
    // A gap edge names no part: the jump to bind mode onto it (an edge
    // feature's or a contributor's Pick -- the `goto` verb) must leave sweep
    // mode, the loaded parts and the tree exactly as they were, and say why on
    // the rows of that edge. Driven through the verb since a_face_is_picked_
    // the_way_cad_picks_it: every rail row on THIS edge is a joint end now,
    // and an end's Pick arms in place on its node's own part (checked below).
    const GAP_EDGE = "hub_to_pitch_plate_spindle_coaxiality";
    const beforeGap = await page.evaluate(() => ({
      sweep: !!window.__sweep, parts: window.__scene.listOpenParts().length,
      rows: document.querySelectorAll("#sweep-tree .tree-row").length,
    }));
    const gapPressed = await page.evaluate(([t, e]) => window.AnnotateApp.exec(["goto", t, e])
      .then(() => true, () => false), [topology.id, GAP_EDGE]);
    await page.waitForFunction((edge) => document.querySelector(
      `#sweep-tree .tree-row[data-edge="${edge}"] .tree-row__note`), GAP_EDGE,
    { timeout: 15000 }).catch(() => {});
    const afterGap = await page.evaluate((edge) => ({
      sweep: !!window.__sweep, inSweep: window.__scene.inSweep(),
      parts: window.__scene.listOpenParts().length,
      rows: document.querySelectorAll("#sweep-tree .tree-row").length,
      note: (document.querySelector(`#sweep-tree .tree-row[data-edge="${edge}"] .tree-row__note`) ||
        {}).textContent || "",
    }), GAP_EDGE);
    push("[real] Pick on a gap edge that names no part leaves sweep mode, every loaded " +
      "part and the tree's rows as they were, and the row carries the reason",
      gapPressed && beforeGap.sweep && afterGap.sweep && afterGap.inSweep &&
      afterGap.parts === beforeGap.parts && afterGap.rows === beforeGap.rows &&
      afterGap.note.indexOf("names no part") !== -1);

    // --- a joint end lists its candidate faces (a_joint_end_lists_its_
    // candidate_faces_and_says_why_each_is_there) -----------------------------
    // Jeff's end: the hub spindle bore axis. Its twisty opens the contact
    // engine's faces, each with why it is there; resting on the first washes
    // that face on the hub in the pre-selection's yellow. Hover only -- this
    // page reads the real inbox, so nothing here is taken.
    let realContact = null;
    try {
      realContact = JSON.parse(await readFile(join(DATA_REPO, "data", "projections",
        "feature-identity", "contact_suggestions.json"), "utf8"));
    } catch { realContact = null; }
    const spindleRow = ((realContact && realContact.topologies) || []).flatMap((t) => t.edges || [])
      .find((r) => r.edge === GAP_EDGE && r.status === "ok");
    const spindleTop = spindleRow && spindleRow.candidates.slice().sort((a, b) => a.rank - b.rank)[0].from;
    const HUB_END = `#sweep-tree .tree-row[data-edge="${GAP_EDGE}"][data-direction="from"]`;
    await page.evaluate((sel) => {
      const r = document.querySelector(sel);
      for (let d = r && r.closest("details"); d; d = d.parentElement && d.parentElement.closest("details")) d.open = true;
    }, HUB_END);
    await page.waitForSelector(HUB_END + " .tree-cands .tree-cand[data-face]", { timeout: 15000 }).catch(() => {});
    const hubList = await page.evaluate((sel) => Array.from(
      document.querySelectorAll(sel + " .tree-cands > .tree-cand")).map((li) => ({
      face: li.dataset.face || null,
      name: (li.querySelector(".tree-row__name") || {}).textContent || "",
      reason: (li.querySelector(".tree-row__face") || {}).textContent || "" })), HUB_END);
    const listed = hubList.filter((r) => r.face !== null);
    console.log(`    hub spindle bore axis: ${listed.length} candidate rows listed, ` +
      `${hubList.length - listed.length} action rows`);
    push("[real] the hub spindle bore axis end lists the contact engine's faces, the top-ranked " +
      "first, each naming its class and radius and why it is there, then show all and the one pick action",
      !!spindleTop && listed.length > 0 && Number(listed[0].face) === spindleTop.faces[0] &&
      listed.every((r) => /^face \d+ · round · r [0-9.]+ mm$/.test(r.name) &&
        /^coaxial with the mating |^fits the mating /.test(r.reason)) &&
      hubList[hubList.length - 1].name === "Pick a face\u2026");
    const hubCam = await settledCamera(page);
    // The top-ranked face's own row, by its face id: the rail rebuilds for
    // seconds after a run loads, and Chrome re-evaluates hover under a
    // resting pointer when the rows shift, so "the first row" can wash the
    // row that slid under the pointer instead. The wash waited for is the
    // top face's.
    const topFace = spindleTop ? spindleTop.faces[0] : null;
    const topRow = page.locator(HUB_END + ` .tree-cands > .tree-cand[data-face="${topFace}"]`).first();
    const hubHover = await topRow.hover({ timeout: 5000 })
      .then(() => "ok").catch((e) => "hover failed: " + String(e.message).slice(0, 160));
    await page.waitForFunction((f) => window.__scene.washed() && window.__scene.washed().faceId === f, topFace,
      { timeout: 15000 }).catch(() => {});
    const hubWash = await page.evaluate(() => ({ w: window.__scene.washed(), cam: window.__scene.cameraState(),
      lastWash: window.__lastWash || null }));
    const hubOk = !!spindleTop && hubWash.w && hubWash.w.sha256 === spindleTop.sha256 &&
      hubWash.w.faceId === spindleTop.faces[0] && hubWash.w.overlays > 0 &&
      hubWash.w.color === hubWash.w.preselectColor && sameCameraState(hubWash.cam, hubCam);
    if (!hubOk) {
      console.log(`    DIAG hub candidate hover: ${hubHover}; washed ${JSON.stringify(hubWash.w)}; ` +
        `lastWash ${JSON.stringify(hubWash.lastWash)}; top ${JSON.stringify(spindleTop)}; ` +
        `camera ${JSON.stringify(hubCam)} -> ${JSON.stringify(hubWash.cam)}`);
    }
    push("[real] hovering its first candidate washes that face on the hub in the pre-selection's " +
      "yellow, and the camera stays", hubOk);
    await page.mouse.move(5, 5);

    // --- Jeff's reproduction: a joint end's Pick arms on its own part ----------
    // a_face_is_picked_the_way_cad_picks_it: Pick on `hub blade-1 root bearing
    // bore` goes to the as-modelled frame with no prompt, the hub alone is
    // solid, and the ray hits only the hub; `arm off` puts it all back.
    const BORE = "hub_blade1_root_bearing_bore";
    await page.evaluate((f) => {
      const r = document.querySelector(`#sweep-tree .tree-row[data-feature="${f}"][data-direction]`);
      for (let d = r && r.closest("details"); d; d = d.parentElement && d.parentElement.closest("details")) d.open = true;
    }, BORE);
    const boreRow = page.locator(`#sweep-tree .tree-row[data-feature="${BORE}"][data-direction]`).first();
    await boreRow.hover({ timeout: 5000 }).catch(() => {});
    await boreRow.locator(":scope > .tree-cands > .tree-cand--other").first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForFunction(() => window.__sweep && window.__sweep.armed && window.__scene.pickFilter(),
      null, { timeout: 30000 }).catch(() => {});
    const armedBore = await page.evaluate(() => {
      const s = window.__scene;
      const filter = s.pickFilter() || [];
      const others = s.listOpenParts().filter((sha) => filter.indexOf(sha) === -1 && s.isVisible(sha));
      const meshes = window.__sweep && window.__sweep.armed ? window.__sweep.armed.partWords : "";
      return { home: window.__sweep.index === window.__sweep.asModelledIndex, filter, meshes,
        // Nothing goes opaque (2026-11-12): the armed part keeps its resting
        // look -- ghost, with See-through on -- and is never solid.
        atRest: filter.every((sha) => s.lookOf(sha) === "ghost" && s.opacityOf(sha) < 1),
        othersFaint: others.length > 0 &&
          others.every((sha) => s.lookOf(sha) === (window.__sweep.armed.near.indexOf(sha) !== -1
            ? "ghost" : "faint")) && others.some((sha) => s.lookOf(sha) === "faint"),
        row: (document.querySelector("#sweep-tree .tree-row--armed .tree-row__face") || {}).textContent || "" };
    });
    push("[real] Pick on hub blade-1 root bearing bore goes to the as-modelled frame with no " +
      "prompt, the hub alone is pickable and keeps its resting look -- nothing goes opaque -- " +
      "its neighbours ghost and every other part faint",
      armedBore.home && armedBore.filter.length === 1 && /hub/.test(armedBore.meshes) &&
      armedBore.atRest && armedBore.othersFaint && /^picking on /.test(armedBore.row));
    // A face pre-selected while armed is named with its class and radius once
    // the hub's classes land, whether the pointer arrived first or not
    // (ISSUE_20261029_no_check_hovers_the_real_bore_so_the_dods_class_and_
    // radius_line_is_unwitnessed). The face is the hub's round spindle bore,
    // off the contact projection; `preselect` is the pointer's own drawing
    // and callback, without a raycast to aim.
    if (spindleTop && spindleTop.sha256 === armedBore.filter[0]) {
      await page.evaluate((f) => window.__scene.preselect({ sha256: f.sha256, faceId: f.faces[0] }), spindleTop);
    }
    await page.waitForFunction(() => /^face \d+ · round · r [0-9.]+ mm$/.test(
      (document.querySelector("#sweep-tree .tree-row--armed .tree-row__face") || {}).textContent || ""),
    null, { timeout: 30000 }).catch(() => {});
    const preLine = await page.evaluate(() =>
      (document.querySelector("#sweep-tree .tree-row--armed .tree-row__face") || {}).textContent || "");
    push("[real] a round hub face pre-selected while armed reads its number, its class and its " +
      "fitted radius on the armed row",
      !!spindleTop && preLine === "face " + spindleTop.faces[0] + " · round · r " + preLine.split(" · r ")[1] &&
      /^face \d+ · round · r [0-9.]+ mm$/.test(preLine));
    await page.evaluate(() => window.__scene.preselect(null));
    // The bore is [hub, blade_root]: the row offers the other part, one click
    // moves the arm, and the ray follows -- the second part's faces can be
    // hovered and picked and the first part's no longer can.
    const hubSha = armedBore.filter[0];
    await page.locator("#sweep-tree .tree-row--armed .tree-row__switch-part").first()
      .click({ timeout: 5000 }).catch(() => {});
    await page.waitForFunction((hub) => {
      const f = window.__scene.pickFilter();
      return f && f.length === 1 && f[0] !== hub;
    }, hubSha, { timeout: 15000 }).catch(() => {});
    const switched = await page.evaluate((hub) => {
      const s = window.__scene;
      const a = window.__sweep.armed;
      const blade = (s.pickFilter() || [])[0];
      s.scene.updateMatrixWorld();
      // A screen point on a triangle of `sha` that the unfiltered ray hits as `sha`.
      const hit = (sha) => {
        const mesh = s.parts.get(sha);
        if (!mesh) return null;
        const p = mesh.geometry.attributes.position.array;
        const step = Math.max(9, Math.floor(p.length / 9 / 400) * 9);
        for (let i = 0; i + 8 < p.length; i += step) {
          const c = [0, 1, 2].map((k) => (p[i + k] + p[i + 3 + k] + p[i + 6 + k]) / 3);
          const v = s.camera.position.clone().set(c[0], c[1], c[2]).applyMatrix4(mesh.matrixWorld).project(s.camera);
          if (Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
          const all = s.pick(v.x, v.y, { all: true });
          if (all && all.sha256 === sha) return v;
        }
        return null;
      };
      const onBlade = hit(blade);
      const onHub = hit(hub);
      return {
        parts: a.parts.map((t) => t.partId), active: a.partWords, blade,
        bladePicked: onBlade ? (s.pick(onBlade.x, onBlade.y) || {}).sha256 === blade : null,
        hubRefused: onHub ? (s.pick(onHub.x, onHub.y) || {}).sha256 !== hub : null,
        line: (document.querySelector("#sweep-tree .tree-row--armed .tree-row__face") || {}).textContent || "",
        button: (document.querySelector("#sweep-tree .tree-row--armed .tree-row__switch-part") || {}).textContent || "",
      };
    }, hubSha);
    push("[real] the armed bore switches to its second part: the filter follows, a face on it " +
      "is pickable, the hub's is not, and the row names the part now armed",
      switched.parts.length === 2 && switched.blade && switched.blade !== hubSha &&
      switched.bladePicked === true && switched.hubRefused === true &&
      /^picking on /.test(switched.line) && switched.line.indexOf(switched.active) !== -1 &&
      /^Pick on /.test(switched.button));
    await page.evaluate(() => window.AnnotateApp.exec(["arm", "off"]));

    // --- a goto is the jump to bind mode ----------------------------------------
    // The verb the shell's row 3D control posts (and an edge feature's pick
    // action). Until 2026-11-12 a contributor row carried a Pick that ran it;
    // the row is the hidden rail's alone, so the button went and the check
    // runs the verb itself, on the bound edge no joint lists.
    await page.evaluate((t) => window.AnnotateApp.exec(["goto", t, "pitch_link_length"]), topology.id)
      .catch(() => {});
    await page.waitForFunction(() => !window.__sweep &&
      document.querySelector("#element-list li.selected"), null, { timeout: 15000 }).catch(() => {});
    const landed = await page.evaluate(() => ({
      sweep: !!window.__sweep, inSweep: window.__scene.inSweep(),
      tree: !!document.getElementById("sweep-tree"),
      selected: (document.querySelector("#element-list li.selected") || {}).title || null,
      list: getComputedStyle(document.getElementById("element-list")).display !== "none",
    }));
    const edgeName = topology.edges.find((e) => e.id === "pitch_link_length").name;
    push("[real] a goto from sweep mode leaves sweep mode, every part back at its " +
      "as-modelled placement, and lands in bind mode with that edge selected",
      !landed.sweep && !landed.inSweep && !landed.tree && landed.list && landed.selected === edgeName);

    // --- ...and the pane is the way back ----------------------------------------
    const openedBefore = beforeGap.parts;
    const hasReturn = await page.evaluate(() => {
      const b = document.querySelector("#sweep-return button");
      return !!b && b.getClientRects().length > 0 && b.textContent.indexOf("back to the sweep") !== -1;
    });
    await page.locator("#sweep-return button").click({ timeout: 5000 }).catch(() => {});
    await page.waitForFunction(() => window.__sweep && document.getElementById("sweep-tree"),
      null, { timeout: 60000 }).catch(() => {});
    await page.waitForFunction((n) => window.__scene.listOpenParts().length >= n, openedBefore,
      { timeout: 60000 }).catch(() => {});
    const restored = await page.evaluate(() => ({
      sweep: !!window.__sweep, inSweep: window.__scene.inSweep(),
      parts: window.__scene.listOpenParts().length,
      back: (document.getElementById("sweep-return") && getComputedStyle(document.getElementById("sweep-return")).display) || "none",
    }));
    push("[real] the return control shows after a goto and restores sweep mode with " +
      "its parts, no filter, and the control gone",
      hasReturn && restored.sweep && restored.inSweep && restored.parts >= openedBefore &&
      restored.back === "none");

    // --- a run the study did not fold: no contributors, and why ----------------
    // (the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.) The
    // older P2 run carries the same Jacobian, so the stop the frame lands on
    // would read plausibly -- which is why the pair is refused, not shown.
    const otherRun = index.runs.find((r) => r !== study.sweep.run_id && /^vpa-pitch-p2-/.test(r));
    if (!otherRun) {
      push("[real] a run the study did not fold (skipped: only one P2 run is on disk)", true);
    } else {
      await page.goto(`${url}?embedded=1&sweep=${otherRun}&kinematic=${SWEEP_RAIL_STUDY}`, { waitUntil: "load" });
      await page.waitForFunction(() => window.__sweep && document.getElementById("sweep-tree"),
        null, { timeout: 60000 }).catch(() => {});
      const refused = await page.evaluate(() => ({
        tree: !!document.getElementById("sweep-tree"),
        group: !!document.querySelector('#sweep-tree [data-group="contributors"]'),
        banner: (document.getElementById("notice-text") || {}).textContent || "",
      }));
      push("[real] on a P2 run the study did not fold, the rail has no contributor " +
        "group and the notice says which run the study was folded on",
        refused.tree && !refused.group &&
        refused.banner.indexOf("Contributors left out") !== -1 &&
        refused.banner.indexOf(study.sweep.run_id) !== -1);
    }

    push("[real] nothing above produced an uncaught error", errors.length === 0);
    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.closeAllConnections();
    server.close();
  }
}

// --- the rail and the scene point at each other (handoff the_rail_and_the_
// scene_point_at_each_other) -------------------------------------------------
//
// On P2, opened from its kinematic study, with real meshes: every rail row
// lights its thing in the scene on hover (read as what the scene DREW for it,
// `__scene.hoverState()`, never as the command having run); a face picked in
// the scene selects its part inside the body it was picked on; a body's
// checkbox hides that body's occurrences and no other repeat of its meshes;
// the type chips hide and restore row kinds; a gap contributor's badge names
// the drawings to read. Screenshots of the hide when SHOTS_DIR is set.
const RAIL_SCENE_SHOTS = process.env.RAIL_SCENE_SHOTS || null;

async function testAnnotateRailAndScene(browser, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const kinematic = await readProjection("kinematic/kinematic_studies.json");
  const study = kinematic && (kinematic.studies || []).find((s) => s.id === SWEEP_RAIL_STUDY);
  const topology = topologies && (topologies.topologies || [])
    .find((t) => study && t.id === study.topology);
  const index = await realDataIndexForTheAnnotator();
  if (!study || !topology || index.runs.indexOf(SWEEP_RAIL_RUN) === -1) {
    push("[real] the rail and the scene on P2 (skipped: the run, the kinematic or the " +
      "topology projection is not on disk -- build them, or pass --repo <main checkout>)", true);
    return reportSuite(label, checks, errors);
  }
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}/apps/annotate/index.html`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await installRealAnnotatorReads(page, { meshes: index.meshes, runs: index.runs,
    aliases: index.aliases,
    binding: { topology: study.topology, edge: "pitch_link_length",
      faces: [["from", 0], ["to", 1]] } });
  const hovered = () => page.evaluate(() => window.__scene.hoverState());
  const leave = async () => {
    await page.mouse.move(1590, 990);
    await page.waitForFunction(() => window.__scene.hoverState().overlays === 0 &&
      !window.__scene.hoverState().joint, null, { timeout: 3000 }).catch(() => {});
  };
  const hoverRow = async (selector) => {
    await leave();
    await page.locator(selector).first().hover({ timeout: 5000 }).catch(() => {});
    await page.waitForFunction(() => window.__lastHover, null, { timeout: 3000 }).catch(() => {});
    return hovered();
  };
  try {
    await page.goto(`${url}?embedded=1&sweep=${SWEEP_RAIL_RUN}&kinematic=${SWEEP_RAIL_STUDY}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__sweep && window.__sweep.bodies &&
      window.__sweep.bodies.length > 0 && Object.keys(window.__sweep.occurrences).length > 0 &&
      document.getElementById("sweep-tree"), null, { timeout: 180000 }).catch(() => {});
    await page.evaluate(() => {
      try { localStorage.removeItem(window.AnnotateApp.PREF_KEYS.sweepRowKinds); } catch (_) { /* none */ }
      return window.AnnotateApp.exec(["seek", "#40"]);
    });

    // --- 1. hover, row to scene --------------------------------------------
    const facts = await page.evaluate(() => {
      const sweep = window.__sweep;
      const armRow = sweep.bodies.find((r) => r.subject === "blade" && r.part === "pitch_arm");
      return {
        bodies: sweep.tree.bodies.map((b) => b.name),
        joints: sweep.tree.joints.map((j) => j.name),
        // Drawn occurrences only: a mesh carried at exactly a matched path
        // (the instrumented blade at the design blade's) is not opened.
        occurrences: Object.fromEntries(Object.keys(sweep.occurrences).map((k) => [k,
          sweep.occurrences[k].filter((o) => window.__scene.parts.has(o.sha256)).length])),
        armSha: armRow ? armRow.sha256 : null,
        armKey: armRow && armRow.placements[0] ? armRow.placements[0].key : null,
        armDrawn: armRow ? window.__scene.drawnOccurrenceKeys(armRow.sha256).length : 0,
      };
    });
    // One literal name per body, so each is a guard a witness can name.
    const bodyLit = async (body) => {
      const h = await hoverRow(`#sweep-tree [data-body="${body}"] > summary`);
      return { h, ok: facts.occurrences[body] > 0 && h.overlays >= 1 &&
        h.occurrences === facts.occurrences[body] };
    };
    push("[real] hovering the base body lights every one of its drawn occurrences",
      (await bodyLit("base")).ok);
    push("[real] hovering the pitch_plate body lights every one of its drawn occurrences",
      (await bodyLit("pitch_plate")).ok);
    const blade = await bodyLit("blade");
    push("[real] hovering the blade body lights every one of its drawn occurrences", blade.ok);
    const arms = blade.h.keys.filter((k) => k.sha256 === facts.armSha);
    push("[real] ...and on blade it is blade 1's pitch arm, one of the five drawn",
      facts.armDrawn === 5 && arms.length === 1 && arms[0].key === facts.armKey);
    await leave();
    push("[real] the pointer leaving a row takes the hover down", (await hovered()).overlays === 0);
    let jointsLit = 0;
    for (const joint of facts.joints) {
      const h = await hoverRow(`#sweep-tree [data-joint="${joint}"] > summary`);
      // Read off the bead the scene DREW, against a joint not hovered.
      const scale = await page.evaluate((j) => {
        const beads = window.__scene._sweep.joints;
        const other = [...beads.keys()].find((k) => k !== j);
        return beads.get(j).scale.x / beads.get(other).scale.x;
      }, joint);
      if (h.joint === joint && scale > 1.2) jointsLit++;
    }
    push("[real] hovering each joint draws its bead larger", jointsLit === facts.joints.length &&
      jointsLit === 5);
    const pitchLink = await hoverRow(`#sweep-tree [data-joint="pitch_link"] > summary`);
    push("[real] ...and a joint with a bound feature lights its bound faces too",
      pitchLink.faces === 2 && pitchLink.overlays > 0);
    await page.locator('#sweep-tree [data-joint="pitch_link"] > summary').click({ timeout: 5000 }).catch(() => {});
    // The length's own row is gone since 2026-11-05 (its two ends are the
    // joint's rows), so its hover is the verb the row used to post.
    await leave();
    await page.evaluate(() => window.AnnotateApp.exec(["hover", "feature", "pitch_link_length"]));
    await page.waitForFunction(() => window.__lastHover, null, { timeout: 3000 }).catch(() => {});
    const feature = await hovered();
    push("[real] hovering a bound feature lights both of its faces", feature.faces === 2 &&
      feature.overlays > 0);
    // pitch_link was opened (selected) above; a hover over one of its rows
    // must leave its bead drawn as the selected one.
    push("[real] a hover leaves the selection where it was",
      await page.evaluate(() => window.__scene.sweepEmphasis() === "pitch_link"));
    const edges = await page.evaluate(() => [...document.querySelectorAll(
      '#sweep-tree [data-group="contributors"] .tree-row')].map((n) => n.dataset.edge));
    let contributorsLit = 0;
    for (const edge of edges) {
      const h = await hoverRow(`#sweep-tree [data-group="contributors"] .tree-row[data-edge="${edge}"]`);
      if (h.overlays > 0) contributorsLit++;
    }
    push("[real] hovering each contributor lights its bound faces, or its edge's parts",
      edges.length === 6 && contributorsLit === edges.length);

    // --- 2. a feature row names its surface ---------------------------------
    const faceWords = await page.evaluate(() => [...document.querySelectorAll(
      '#sweep-tree [data-joint="pitch_link"] .tree-row[data-feature] .tree-row__face')]
      .map((n) => ({ id: n.closest(".tree-row").dataset.feature, text: n.textContent })));
    // The seeded binding is face 0 at the length's from end (the lower
    // centre) and face 1 at its to end (the upper).
    const lowerEnd = faceWords.find((f) => f.id === "pitch_link_lower_sphere_centre");
    const upperEnd = faceWords.find((f) => f.id === "pitch_link_upper_sphere_centre");
    push("[real] a bound feature row says which face of which part defines it, and an " +
      "unbound one says none is bound",
      lowerEnd && /^face 0 of .+$/.test(lowerEnd.text) && upperEnd && /^face 1 of .+$/.test(upperEnd.text) &&
      faceWords.every((f) => /^face \d+ of |^no face bound$/.test(f.text)));

    // --- 3. scene to rail ---------------------------------------------------
    await page.evaluate((f) => window.__scene.onPick({ sha256: f.armSha, faceId: 0, key: f.armKey }), facts);
    await page.waitForFunction(() => window.__lastInspect && window.__lastInspect.kind === "part",
      null, { timeout: 3000 }).catch(() => {});
    const picked = await page.evaluate((f) => {
      const row = document.querySelector(`#sweep-tree .part-row.selected[data-sha="${f.armSha}"]`);
      return { subject: row ? row.dataset.subject : null,
        open: document.querySelector('#sweep-tree [data-body="blade"]').open,
        shown: !!row && row.getClientRects().length > 0 };
    }, facts);
    push("[real] picking blade 1's pitch arm in the scene, away from the as-modelled frame, " +
      "selects its row under blade and opens blade",
      picked.subject === "blade" && picked.open && picked.shown);
    const elsewhere = await page.evaluate((f) => {
      const keys = window.__scene.drawnOccurrenceKeys(f.armSha).filter((k) => k !== f.armKey);
      window.__scene.onPartHover({ sha256: f.armSha, faceId: 0, key: keys[0] });
      const lit = [...document.querySelectorAll("#sweep-tree .is-scene-hover")].length;
      window.__scene.onPartHover({ sha256: f.armSha, faceId: 0, key: f.armKey });
      const mine = [...document.querySelectorAll("#sweep-tree .part-row.is-scene-hover")]
        .map((n) => n.dataset.subject);
      window.__scene.onPartHover(null);
      return { lit, mine, after: document.querySelectorAll("#sweep-tree .is-scene-hover").length };
    }, facts);
    push("[real] the pointer resting on blade 1's pitch arm emphasises its row under blade; " +
      "on a pitch arm no body carries, nothing",
      elsewhere.lit === 0 && elsewhere.mine.join() === "blade" && elsewhere.after === 0);
    await page.evaluate(() => window.__scene.onPick(null));

    // --- 4. hiding a body hides its occurrences, not every repeat ------------
    const drawnOf = () => page.evaluate((f) => {
      const scene = window.__scene;
      const blade = window.__sweep.occurrences.blade.filter((o) => scene.parts.has(o.sha256));
      const nodes = (sha) => scene._occurrenceNodes(sha);
      return {
        arm: nodes(f.armSha).filter((n) => n.visible).length,
        armHiddenIsBlade1: nodes(f.armSha).filter((n) => !n.visible).map((n) => n.userData.key).join() === f.armKey,
        blade: blade.filter((o) => scene.isOccurrenceVisible(o.sha256, o.key)).length,
        of: blade.length,
        checkbox: document.querySelector('#sweep-tree [data-body="blade"] > summary input').checked,
      };
    }, facts);
    if (RAIL_SCENE_SHOTS) await page.screenshot({ path: join(RAIL_SCENE_SHOTS, "1_blade_shown.png") });
    const before = await drawnOf();
    await page.locator('#sweep-tree [data-body="blade"] > summary input').click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    if (RAIL_SCENE_SHOTS) await page.screenshot({ path: join(RAIL_SCENE_SHOTS, "2_blade_hidden.png") });
    const after = await drawnOf();
    push("[real] unticking blade hides blade 1 and its pitch arm; the other four pitch arms stay",
      before.arm === 5 && before.blade === before.of && before.checkbox &&
      after.arm === 4 && after.armHiddenIsBlade1 && after.blade === 0 && !after.checkbox);
    await page.evaluate(() => window.AnnotateApp.exec(["seek", "#10"]));
    push("[real] ...and it stays hidden as the sweep moves", (await drawnOf()).arm === 4);
    await page.locator('#sweep-tree [data-body="blade"] > summary input').click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(200);
    push("[real] ticking it again brings both back", (await drawnOf()).arm === 5);

    // --- 5. the type chips ----------------------------------------------------
    const kinds = () => page.evaluate(() => {
      const shown = (sel) => [...document.querySelectorAll(sel)].some((n) => n.getClientRects().length > 0);
      return { bodies: shown('#sweep-tree [data-group="bodies"]'),
        joints: shown('#sweep-tree [data-group="joints"]'),
        features: shown("#sweep-tree .tree-row[data-feature]"),
        contributors: shown('#sweep-tree [data-group="contributors"]') };
    });
    const all = await kinds();
    const chips = ["bodies", "features", "contributors", "joints"];
    let hidesOnlyItsOwn = true;
    for (const kind of chips) {
      await page.locator(`#sweep-tree .an__tree-chip[data-kind="${kind}"]`).click({ timeout: 5000 }).catch(() => {});
      const k = await kinds();
      if (k[kind]) hidesOnlyItsOwn = false;
      if (kind === "bodies" && (!k.joints || !k.contributors)) hidesOnlyItsOwn = false;
    }
    const none = await kinds();
    const remembered = await page.evaluate(() =>
      localStorage.getItem(window.AnnotateApp.PREF_KEYS.sweepRowKinds));
    for (const kind of chips) {
      await page.locator(`#sweep-tree .an__tree-chip[data-kind="${kind}"]`).click({ timeout: 5000 }).catch(() => {});
    }
    const back = await kinds();
    push("[real] each type chip hides its row kind and only that, the choice is remembered, " +
      "and pressing it again restores it",
      all.bodies && all.joints && all.features && all.contributors && hidesOnlyItsOwn &&
      !none.bodies && !none.joints && !none.contributors &&
      JSON.parse(remembered || "[]").length === 4 &&
      back.bodies && back.joints && back.features && back.contributors);

    // --- 6. a gap contributor's alert says what resolves it -------------------
    // The subject is read from the projection, never named: the rows whose
    // kind is `gap`. None since the_tangential_link_cites_its_drawing -- then
    // the badge's witness is the fixture's (section 1), and these say so.
    const gapEdges = [...new Set(study.stops.flatMap((s) => s.rows)
      .filter((r) => r.kind === "gap").map((r) => r.edge))];
    const popFor = async (edge) => {
      await page.locator(`#sweep-tree .tree-row[data-edge="${edge}"] .alertbadge`).hover({ timeout: 5000 }).catch(() => {});
      return page.evaluate(() => {
        const pop = document.getElementById("alert-pop");
        return pop && pop.style.display !== "none" ? pop.textContent : "";
      });
    };
    if (!gapEdges.length) {
      // A skip is named on the console and is not a check: nothing was shown.
      console.log(`[${label}] SKIP: the live kinematic study has no gap row, so there is no live ` +
        "badge to open (the fixture's own gap row is checked in section 1; " +
        "ISSUE_20261026_the_rail_gap_badge_browser_checks_read_gap_rows_integration_no_longer_has)");
    } else {
      const edge = gapEdges[0];
      const pop = await popFor(edge);
      const drawings = (topology.parts || []).filter((p) => p.drawing &&
        (topology.edges.find((e) => e.id === edge) || {}).part === p.id).map((p) => p.drawing);
      push("[real] a live gap row's badge opens a popup naming what resolves it, its drawing and Pick",
        pop.indexOf("Pick") !== -1 && drawings.every((d) => pop.indexOf(d) !== -1));
    }

    // --- the frame-rate cost of a hover, measured, never checked --------------
    // Drawn frames per second while the sweep plays, with nothing hovered and
    // with the base body (the 286-solid hub) lit: the lesson's figure.
    const rate = (command) => page.evaluate(async (cmd) => {
      const AA = window.AnnotateApp;
      await AA.exec(cmd);
      await AA.exec(["play"]);
      const n0 = window.__scene.renderCount, t0 = performance.now();
      await new Promise((r) => setTimeout(r, 3000));
      const fps = (window.__scene.renderCount - n0) / ((performance.now() - t0) / 1000);
      await AA.exec(["pause"]);
      await AA.exec(["hover", "clear"]);
      return fps;
    }, command);
    await leave();
    const plain = await rate(["hover", "clear"]);
    const lit = await rate(["hover", "body", "base"]);
    console.log(`[${label}] playing P2: ${plain.toFixed(1)} drawn fps with nothing hovered, ` +
      `${lit.toFixed(1)} with the base body hovered`);

    // --- 7. leaving puts every occurrence back --------------------------------
    // The pitch arm stays loaded past `sweep off` only if the sweep did not
    // open it, so it is taken off that list: the case of a part the reader
    // had open before the sweep, which is the case the put-back is for.
    await page.evaluate((f) => {
      window.__sweep.openedBySweep = window.__sweep.openedBySweep.filter((s) => s !== f.armSha);
      return window.AnnotateApp.exec(["hide-body", "blade"]);
    }, facts);
    await page.evaluate(() => window.AnnotateApp.exec(["sweep", "off"]));
    const restored = await page.evaluate((f) => ({
      loaded: window.__scene.parts.has(f.armSha),
      hidden: window.__scene.parts.has(f.armSha)
        ? window.__scene._occurrenceNodes(f.armSha).filter((n) => !n.visible).length : -1,
      hover: window.__scene.hoverState().overlays,
    }), facts);
    push("[real] leaving sweep mode puts back every occurrence a body checkbox hid and takes the hover down",
      restored.loaded && restored.hidden === 0 && restored.hover === 0);

    push("[real] nothing above produced an uncaught error", errors.length === 0);
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
  // The parts panel is one list in two groups since a_context_filter_and_a_view_
  // filter: "in this model" (a header row, then the model's parts) and a folded
  // "Other parts". `parts()` is every listed mesh, in either group, header
  // excluded; `modelParts()` is the first group alone, which is what an
  // element filter scopes. The expected totals are read off the mock's own
  // store, so growing the fixture does not repeat this red.
  const parts = () => page.locator("#parts-panel li.part-row:not(.part-row--head)");
  const modelParts = () => page.locator("#parts-panel > li.part-row:not(.part-row--head)");
  const installedMeshes = () => page.evaluate(
    () => Object.keys(window.AnnotateApp.FIXTURES.meshProvenance).length);
  try {
    // --- unfiltered: what the rail has always shown ------------------------
    await page.goto(url + "?embedded=1&mock=1", { waitUntil: "load" });
    await page.waitForSelector("#element-list li.el-row", { timeout: 15000 });
    const allRows = await rows().count();
    const allParts = await parts().count();
    push("unfiltered, the rail lists the whole study and every installed mesh",
      allRows === 3 && allParts === await installedMeshes());
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
    // ...nor a triangle CHARACTER (stack_page_alert_marks_and_drawn_glyph,
    // 2026-09-22). Jeff, of this badge beside the viewer's: "same purpose,
    // just in a different place" -- so it is the same mark, drawn once in
    // apps/viewer/warning_icon.js and loaded across the app boundary. The
    // fast tier pins the geometry it is built from; this is the only tier that
    // can say the RENDERED badge is a sized picture with no text in it.
    const railMark = await page.locator("#element-list .alertbadge").first()
      .evaluate((n) => {
        const svg = n.querySelector("svg");
        const box = svg && svg.getBoundingClientRect();
        return {
          paths: n.querySelectorAll("path").length,
          w: box ? Math.round(box.width) : 0,
          h: box ? Math.round(box.height) : 0,
          text: n.textContent,
          colour: getComputedStyle(n).color,
        };
      });
    push(`the rail's badge is DRAWN, not typed — one path, 16px, no text ` +
      `(${railMark.w}x${railMark.h})`,
      railMark.paths === 1 && railMark.w >= 14 && railMark.h >= 14 &&
      railMark.w === railMark.h && railMark.text === "");
    push("no triangle character anywhere in the rail",
      !/\u26A0/.test(rowText || ""));
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
    await page.goto(url + "?embedded=1&mock=1&topology=demo_system&edge=demo_edge_untraced",
      { waitUntil: "load" });
    await page.waitForSelector("#rail-filter", { state: "visible", timeout: 15000 });
    push("arriving at an edge scopes the element list to that one element",
      await rows().count() === 1);
    // The model holds the element's part and the panel still lists every
    // installed mesh, the rest folded under "Other parts". The mock topology
    // itself has one part, so "one in the model" also holds before an element
    // is chosen; the discriminating case is the no-installed-mesh edge below
    // (1 -> 0), which is what the browser spec for it declares as its witness.
    push("...and the parts panel to the parts that element names -- the panel " +
      "that was scoped by nothing at all before",
      await modelParts().count() === 1 &&
      await parts().count() === await installedMeshes());
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
    await page.goto(url + "?embedded=1&mock=1&topology=demo_system&edge=demo_edge_no_owner",
      { waitUntil: "load" });
    await page.waitForSelector("#rail-filter", { state: "visible", timeout: 15000 });
    // "To nothing" is the model's group: no parts, so no "in this model" header
    // either, and every installed mesh is listed as an other part.
    push("an element whose part has no installed mesh filters the parts panel " +
      "to nothing AND says why",
      await modelParts().count() === 0 &&
      await page.locator("#parts-panel > li.part-row--head").count() === 0 &&
      await parts().count() === await installedMeshes() &&
      /No installed 3D part for/.test(
        (await page.locator("#rail-filter").textContent()) || ""));

    // --- a face can be deselected (deliverable 3) --------------------------
    await page.goto(url + "?embedded=1&mock=1&topology=demo_system&edge=demo_edge_untraced" +
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
    // ...and the TOP BAR says so in words. It used to read `Picked: part
    // 000000000000…, face 0` -- a checksum prefix and a face number, neither
    // of which a reader of this page can act on. Since 2026-09-21 the bar's
    // one line is the instruction composed from the element
    // (AA.taskInstruction), so what is asserted is that it names the ACTION
    // the pick has enabled.
    push("...and the top bar names the action the pick has enabled",
      /Bind the selected face to Demo untraced edge/.test(
        (await page.locator("#detail").textContent()) || ""));

    // THE BUG, and the verb that fixes it. Before this handoff the pick state
    // cleared and the orange stayed: `restoreColors` was reachable only from
    // inside `highlightFace`, on its way to tinting the NEXT face.
    await page.evaluate(() => window.AnnotateApp.exec(["deselect"]));
    push("deselect puts the mesh back to its own colours -- the tint, not just " +
      "the pick state, which is the pair that used to disagree",
      !(await tinted()) &&
      (await page.evaluate(() => window.__scene.highlightedFace())) === null);
    // The fixture's `demo_edge_untraced` already has a `to` binding, so the
    // bar asks for the REMAINING face -- the singular/plural comes from what
    // the binding still needs, not from a guess about the element's kind.
    push("...and the top bar goes back to asking for a face",
      /Select the remaining face that defines Demo untraced edge/.test(
        (await page.locator("#detail").textContent()) || ""));

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
    //   3. The scene SETTLED before it is aimed at. The aim below is a
    //      projection through the camera onto the canvas's rect; anything
    //      that moves either between the aim and the click (a ResizeObserver
    //      resize after the top bar's line changed, a frame not yet drawn)
    //      sends a real click somewhere the check never confirmed. So the
    //      canvas's rect, its drawing buffer, the camera's aspect and the
    //      render loop's dirty flag must agree across consecutive frames
    //      first -- a barrier, not a longer ceiling after the click (red at
    //      a 15 s ceiling, 2026-11-05).
    const sceneStill = () => page.waitForFunction(() => {
      const scene = window.__scene;
      const canvas = document.querySelector("#canvas-host canvas");
      const host = document.querySelector("#canvas-host");
      if (!scene || !canvas || !host) return false;
      const r = canvas.getBoundingClientRect();
      const dpr = scene.renderer.getPixelRatio();
      const key = JSON.stringify([r.left, r.top, r.width, r.height, canvas.width, canvas.height,
        scene.camera.aspect]);
      const fits = Math.abs(r.width - host.clientWidth) <= 1 && Math.abs(r.height - host.clientHeight) <= 1 &&
        Math.abs(canvas.width - Math.floor(host.clientWidth * dpr)) <= 1 &&
        Math.abs(scene.camera.aspect - host.clientWidth / host.clientHeight) < 1e-6;
      const same = window.__sceneStillKey === key;
      window.__sceneStillKey = key;
      return fits && same && !scene.dirty;
    }, null, { timeout: 15000, polling: "raf" }).then(() => true, () => false);
    await sceneStill();
    const hit = await page.evaluate((s) => {
      const scene = window.__scene;
      const mesh = scene.parts.get(s);
      // Through the part's own matrix: since 2026-10-14 it sits where the
      // assembly puts it, which is a placement and not just an offset.
      mesh.updateMatrixWorld(true);
      const centre = mesh.geometry.boundingBox.getCenter(mesh.position.clone())
        .applyMatrix4(mesh.matrixWorld);
      const cx = centre.x, cy = centre.y, cz = centre.z;
      scene.camera.position.set(cx, cy, cz + 40);
      scene.camera.lookAt(cx, cy, cz);
      scene.controls.target.set(cx, cy, cz);
      scene.controls.update();
      scene.camera.updateMatrixWorld(true);

      const centroid = mesh.userData.manifest.faces[0].centroid_native;
      const point = mesh.position.clone()
        .set(centroid[0], centroid[1], centroid[2]).applyMatrix4(mesh.matrixWorld);
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
      // Waited for on the effect, not sampled: the pick runs on the pointer's
      // release and the tint lands after it, so a read straight after the
      // click raced it -- red 2 runs in 3 on 2026-10-28 with nothing on the
      // pick path changed (the_scene_pane_is_one_flyout_that_reads_over_http).
      await page.waitForFunction((s) => {
        const mesh = window.__scene.parts.get(s);
        const live = mesh.geometry.attributes.color.array;
        const base = mesh.userData.baseColors;
        for (let i = 0; i < base.length; i++) if (live[i] !== base[i]) return true;
        return false;
      }, sha, { timeout: 15000, polling: 100 }).catch(() => {});
      const tintHeld = await tinted() &&
        (await page.evaluate(() => window.__scene.highlightedFace())) !== null;
      if (!tintHeld) {
        console.log(`      [${label}] DIAG face click: aimed ${JSON.stringify(hit)}; now ` +
          JSON.stringify(await page.evaluate(([s, at]) => {
            const scene = window.__scene;
            const canvas = document.querySelector("#canvas-host canvas");
            const r = canvas.getBoundingClientRect();
            const top = document.elementFromPoint(at.x, at.y);
            return { tinted: (() => {
              const mesh = scene.parts.get(s);
              const live = mesh.geometry.attributes.color.array;
              const base = mesh.userData.baseColors;
              for (let i = 0; i < base.length; i++) if (live[i] !== base[i]) return true;
              return false;
            })(), face: scene.highlightedFace(), canvas: [r.left, r.top, r.width, r.height],
            buffer: [canvas.width, canvas.height], aspect: scene.camera.aspect,
            camera: scene.camera.position.toArray(), top: top && (top.id || top.tagName) };
          }, [sha, hit])));
      }
      push("a real click on the face tints it", tintHeld);
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
        /Select the remaining face/.test(
          (await page.locator("#detail").textContent()) || ""));
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
    await page.goto(url + "?embedded=1&mock=1", { waitUntil: "load" });
    await page.waitForSelector("#element-list li.el-row", { timeout: 15000 });
    await page.locator("#element-list .alertbadge").first().click();
    push("clicking the alert badge opens its popup and does NOT select the row",
      await page.locator("#alert-pop").isVisible() &&
      await page.locator("#element-list li.el-row.selected").count() === 0);

    // --- the placement rule, in the gated tier -----------------------------
    //
    // An opened part is drawn at EVERY occurrence the assembly records, and a
    // pick on any of them names the part-local (sha256, face id). Until now only
    // apps/annotate/run_browser_check.mjs, which no gate runs, saw this, so the
    // wiring (`scene.placementsFor`) could be deleted green in every gated tier.
    // The mock part carries two recorded occurrences, 200 mm apart, and the
    // expectation is read off the fixture's own provenance.
    await page.goto(url + "?embedded=1&mock=1", { waitUntil: "load" });
    await page.waitForFunction(() => window.__scene && window.AnnotateApp &&
      window.AnnotateApp.exec, null, { timeout: 15000 });
    await page.evaluate((s) => window.AnnotateApp.exec(["open-part", s]), sha);
    const placed = await page.evaluate((s) => {
      const want = window.AnnotateApp.FIXTURES.meshProvenance[s].extraction.instances
        .map((i) => i.placement_world);
      // drawnPlacements is row-major 4x4 columns-first; compare as the 3x4
      // the fixture records.
      const drawn = window.__scene.drawnPlacements(s).map((e) =>
        [e[0], e[4], e[8], e[12], e[1], e[5], e[9], e[13], e[2], e[6], e[10], e[14]]);
      return { want, drawn };
    }, sha);
    push("an opened part is drawn at EVERY occurrence the assembly records, at " +
      "its own placement",
      placed.want.length === 2 && placed.drawn.length === placed.want.length &&
      placed.drawn.every((m, i) => m.every((x, k) => Math.abs(x - placed.want[i][k]) < 1e-9)));
    const both = await pickSameFaceBothWays(page, sha, 1, 0);
    push("a pick on the part's second occurrence names the same (part, face) a " +
      "pick named with the part at its own origin",
      both.placed && both.unplaced && both.placed.sha256 === both.unplaced.sha256 &&
      both.placed.faceId === both.unplaced.faceId && both.placed.faceId === 0 &&
      both.placed.occurrence === 1);

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

// --- the face-suggestion display (handoff annotate_face_suggestions) --------
//
// Four claims, and every one of them is about what is ON SCREEN, which is why
// they are here rather than in apps/annotate/run_tests.cjs. That suite owns the
// RULES (which faces, and why) against synthetic classifications and the real
// mesh store; it cannot see a colour, cannot see a body fade, and cannot see
// two overlays coexist.
//
//   1. Selecting an element really colours the candidates. The plan is data;
//      the overlay is geometry added to a three.js scene, in a colour read off
//      the live material.
//   2. The two overlays COEXIST and are different colours -- the bound face
//      stays green while the candidate is the accent, which is the whole reason
//      scene.js keys its overlay colours by what the overlay claims.
//   3. Picking a candidate moves it to the pick colour rather than drawing two
//      opaque overlays on one face.
//   4. The switch really switches, and survives a reload -- and, the thing the
//      first build of this got wrong, it does not fight the See-through switch:
//      both are live at once and each does its own job.
//
// ?mock=1 throughout, like the other two annotate suites: FSA cannot be granted
// from an automated browser. The fixture was grown for this (fixtures.js) -- a
// named interface table and a second mesh face, because a suggestion needs a
// candidate that is not already bound.
async function testAnnotateSuggestions(browser, label) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}/apps/annotate/index.html`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const setting = (text) =>
    page.locator("#hint-panel label.an__setting", { hasText: text }).locator("input");
  const openHelp = async () => {
    await page.locator("#detail .an__disclose").click();
    await page.waitForSelector("#hint-panel", { state: "visible", timeout: 5000 });
  };
  // The overlays of one role, with the colour each is actually drawn in --
  // read off the live material, because "it is the accent" is a CSS-token claim
  // and a class-name check would pass straight through a wrong hex.
  const overlays = (role) => page.evaluate((r) => window.__scene._marks
    .filter((m) => m.role === r)
    .map((m) => ({ faceId: m.faceId, color: m.material.color.getHexString() })), role);
  const ghosted = (sha) => page.evaluate((s) => {
    const mesh = window.__scene.parts.get(s);
    return !!(mesh && mesh.material.transparent && mesh.material.opacity < 1);
  }, sha);
  const element = url + "?embedded=1&mock=1&topology=demo_system&edge=demo_edge_untraced";
  try {
    await page.goto(url + "?embedded=1&mock=1", { waitUntil: "load" });
    await page.waitForSelector("#element-list li.el-row", { timeout: 15000 });
    await page.evaluate(() => {
      Object.keys(window.AnnotateApp.PREF_KEYS)
        .forEach((k) => window.localStorage.removeItem(window.AnnotateApp.PREF_KEYS[k]));
    });

    // --- 1. arriving at an element colours the candidates -------------------
    await page.goto(element, { waitUntil: "load" });
    await page.waitForSelector("#rail-filter", { state: "visible", timeout: 15000 });
    const sha = await page.evaluate(() => window.AnnotateApp.FIXTURES.demoSha);
    await page.waitForFunction(
      () => window.__scene && window.__scene.listMarks("suggested").length > 0,
      null, { timeout: 15000 });
    const suggested = await overlays("suggested");
    // The fixture binds face 0, so face 1 is the candidate: the same-part
    // parallel narrowing keeps it and the bound face is not offered again.
    push("selecting an element colours the face that could be its feature",
      suggested.length === 1 && suggested[0].faceId === 1);
    push("...in the shared accent, read off the live material",
      suggested.length === 1 && "#" + suggested[0].color === "#6ea8fe");
    push("...and the top bar says how far the list was narrowed, in words",
      /likely face/.test(
        (await page.locator("#detail .an__suggestion-note").textContent()) || ""));
    push("...with the body see-through, so a candidate behind it is visible",
      await ghosted(sha));
    // ONE BODY, counted by GEOMETRY: since 2026-10-14 a part is drawn at every
    // occurrence the assembly records (the mock part has two), and its repeats
    // share the part's geometry -- a duplicate body would bring its own.
    push("...and the element's part is in the scene exactly once",
      await page.evaluate(() => new Set(window.__scene.scene.children
        .filter((c) => c.isMesh && c.geometry && c.geometry.attributes.color)
        .map((c) => c.geometry)).size) === 1);

    // --- 2. the two claims coexist, in two colours --------------------------
    //
    // Through a SCOPE entry, because that is what puts a bound-face mark on
    // screen (`trace` marks every bound face in the scope; an element entry
    // never has). Then one element is selected on top of it, which is the
    // state a reader is actually in: one face green because a binding attaches
    // there, another in the accent because it could be the one they are about
    // to bind.
    await page.goto(url + "?embedded=1&mock=1&trace=1&topology=demo_system&study=demo_study",
      { waitUntil: "load" });
    await page.waitForFunction(() => window.__lastTrace !== undefined, null,
      { timeout: 15000 });
    push("a scope entry marks the face already bound, in green",
      (await overlays("bound")).length === 1 &&
      (await overlays("bound"))[0].faceId === 0 &&
      (await overlays("suggested")).length === 0);
    await page.locator("#element-list li.el-row", { hasText: "Demo untraced edge" })
      .first().click();
    await page.waitForFunction(
      () => window.__scene.listMarks("suggested").length === 1, null, { timeout: 5000 });
    const traced = { bound: await overlays("bound"), suggested: await overlays("suggested") };
    push("selecting an element on top of it colours the candidate WITHOUT " +
      "taking the bound mark down -- 'a binding attaches here' and 'this could " +
      "be it' are two claims that coexist",
      traced.bound.length === 1 && traced.bound[0].faceId === 0 &&
      traced.suggested.length === 1 && traced.suggested[0].faceId === 1 &&
      traced.bound[0].color !== traced.suggested[0].color);
    const bound = traced.bound;

    // ...and the switch comes down on ONE of those two layers. Checked here
    // rather than on an element entry for the same reason the pair above is:
    // this is the only state in which there is a bound mark to leave alone.
    await openHelp();
    await setting("Suggest likely faces").uncheck();
    await page.waitForFunction(
      () => window.__scene.listMarks("suggested").length === 0, null, { timeout: 5000 });
    push("unticking the switch takes the candidate colours off, now",
      (await overlays("suggested")).length === 0);
    push("...and leaves the bound face marked -- it was never a suggestion",
      (await overlays("bound")).length === 1);
    push("...and leaves See-through alone, which owns the body's translucency",
      await ghosted(sha) && await setting("See-through parts").isChecked());
    await setting("Suggest likely faces").check();
    await page.waitForFunction(
      () => window.__scene.listMarks("suggested").length === 1, null, { timeout: 5000 });
    push("...and ticking it back puts them on again",
      (await overlays("suggested")).length === 1);

    // Back to the element entry for the pick checks below.
    await page.goto(element, { waitUntil: "load" });
    await page.waitForSelector("#rail-filter", { state: "visible", timeout: 15000 });
    await page.waitForFunction(
      () => window.__scene.listMarks("suggested").length === 1, null, { timeout: 15000 });

    // --- 3. picking a candidate moves it to the pick colour -----------------
    await page.evaluate((s) => window.AnnotateApp.exec(["select-face", s, "1"]), sha);
    await page.waitForFunction(
      () => window.__scene.listMarks("picked").length === 1, null, { timeout: 5000 });
    const picked = await overlays("picked");
    const afterPick = await overlays("suggested");
    push("picking a suggested face draws it as the PICK",
      picked.length === 1 && picked[0].faceId === 1);
    push("...and stops drawing it as a suggestion -- one face, one overlay",
      afterPick.every((m) => m.faceId !== 1));
    push("...in a third colour again", picked[0].color !== suggested[0].color &&
      picked[0].color !== bound[0].color);
    await page.evaluate(() => window.AnnotateApp.exec(["deselect"]));
    await page.waitForFunction(
      () => window.__scene.listMarks("picked").length === 0, null, { timeout: 5000 });
    push("letting the face go takes its overlay down and puts the suggestion back",
      (await overlays("suggested")).length === 1);

    // --- 4. the two switches side by side -----------------------------------
    //
    // See-through off WHILE suggestions are on: the conflict the first build of
    // this had. The suggestion display used to fade the body unconditionally,
    // so this switch did nothing a reader could see.
    await openHelp();
    await setting("See-through parts").uncheck();
    push("with suggestions ON, unticking See-through still makes the body solid",
      !(await ghosted(sha)));
    push("...and the candidates stay coloured",
      (await overlays("suggested")).length === 1);
    // ...and it has to SURVIVE the next suggestion run, which is the half a
    // display that fades the body itself takes back. Deselect the element and
    // select it again: that is the gesture a reader makes constantly, and it
    // re-runs `suggest` from scratch.
    const row = page.locator("#element-list li.el-row", { hasText: "Demo untraced edge" })
      .first();
    await row.click();
    await page.waitForFunction(
      () => window.__scene.listMarks("suggested").length === 0, null, { timeout: 5000 });
    await row.click();
    await page.waitForFunction(
      () => window.__scene.listMarks("suggested").length === 1, null, { timeout: 5000 });
    push("...and the solid body survives the next suggestion run -- the " +
      "suggestion display asks what See-through says, it never decides",
      !(await ghosted(sha)) && (await overlays("suggested")).length === 1);
    await setting("See-through parts").check();
    push("...and ticking it back restores the see-through body", await ghosted(sha));

    // The setting outlives the page, like the other two.
    await setting("Suggest likely faces").uncheck();
    await page.goto(element, { waitUntil: "load" });
    await page.waitForSelector("#rail-filter", { state: "visible", timeout: 15000 });
    await openHelp();
    push("an unticked suggestion switch survives a reload",
      !(await setting("Suggest likely faces").isChecked()) &&
      (await overlays("suggested")).length === 0);
    push("...and nothing on the bar claims a narrowing that is switched off",
      await page.locator("#detail .an__suggestion-note").count() === 0);

    // ...and the verb is never gated: a command typed by hand does what it says.
    await page.evaluate(() => window.AnnotateApp.exec(["suggest"]));
    await page.waitForFunction(
      () => window.__scene.listMarks("suggested").length === 1, null, { timeout: 5000 });
    push("the `suggest` verb still runs with the switch off -- a verb typed by " +
      "hand does what it says",
      (await overlays("suggested")).length === 1);

    // --- an element whose words say nothing shows NOTHING -------------------
    await setting("Suggest likely faces").check();
    await page.goto(url + "?embedded=1&mock=1&topology=demo_system&edge=demo_edge_traced",
      { waitUntil: "load" });
    await page.waitForSelector("#element-list li.el-row.selected", { timeout: 15000 });
    // demo_edge_traced names no part at all, so there is nothing to suggest --
    // and the bar must not be lit up about it.
    push("an element with no part suggests nothing, and says nothing about " +
      "narrowing", (await overlays("suggested")).length === 0);

    // --- scene.loadPart's concurrency contract, driven ---------------------
    //
    // Two callers ask for the same part before either finishes. In normal use
    // that pair is `goto` (which opens the element's part) and the suggestion
    // display, which `select-edge` starts and a click handler does not await --
    // but their relative timing is not deterministic enough to be a guard, so
    // the contract is DRIVEN here rather than hoped for. Without the shared
    // in-flight promise both callers build a THREE.Mesh, and the second is
    // unreachable through `scene.parts` and therefore impossible to hide,
    // frame or dispose. Counted off the live scene graph, because that map is
    // exactly where the duplicate is NOT.
    //
    // Last in the suite because it unloads and reloads the part, which drops
    // its overlays. Bodies are counted by geometry, as above: a part's
    // repeats at its other occurrences share it.
    const bodies = await page.evaluate(async (s) => {
      const scene = window.__scene;
      scene.unloadPart(s);
      await Promise.all([scene.loadPart(s), scene.loadPart(s)]);
      return new Set(scene.scene.children
        .filter((c) => c.isMesh && c.geometry && c.geometry.attributes.color)
        .map((c) => c.geometry)).size;
    }, sha);
    push("two callers that both ask for one part before either finishes get " +
      "ONE body in the scene", bodies === 1);

    // --- the faces that touch (an_interface_suggests_the_faces_that_touch) --
    //
    // The studyless topology's one edge carries a two-candidate contact row in
    // the fixture (fixtures.js `contactSuggestions`): the demo triangle with
    // the bracket, then with the plate. After the block above on purpose: it
    // opens two more parts, which that block's body count would see. Marks are
    // read with their PART, because a contact pair is two parts by definition.
    const contactMarks = () => page.evaluate(() => window.__scene._marks
      .filter((m) => m.role === "contact")
      .map((m) => m.sha256.charAt(0) + ":" + m.faceId + ":" + m.material.color.getHexString())
      .sort());
    await page.goto(url + "?embedded=1&mock=1&topology=demo_studyless&edge=demo_studyless_edge",
      { waitUntil: "load" });
    await page.waitForSelector("#detail .an__contact", { timeout: 15000 });
    await page.waitForFunction(
      () => window.__scene.listMarks("contact").length === 2, null, { timeout: 5000 });
    const topPair = await contactMarks();
    push("a gap edge's top touching pair is coloured on both of its parts, in " +
      "a hue that is not the suggestion colour",
      JSON.stringify(topPair) === JSON.stringify(["0:0:b48cf2", "1:1:b48cf2"]));
    const listed = await page.locator("#detail .an__contact").allTextContents();
    push("...and listed in the bar, best first, each as one line of evidence " +
      "in everyday words",
      listed.length === 2 && listed[0] === "pin in bore, clearance 0.003 mm, 2.20 mm shared" &&
      (await page.locator("#detail .an__contact").first().getAttribute("aria-pressed")) === "true");
    await page.locator("#detail .an__contact").nth(1).click();
    await page.waitForFunction(
      () => window.__scene.listMarks("contact").some((m) => m.sha256.charAt(0) === "2"),
      null, { timeout: 5000 });
    const framed = await page.evaluate(() => window.__scene.controls.target.toArray());
    push("clicking a listed pair colours that pair instead and frames the " +
      "camera on it",
      JSON.stringify(await contactMarks()) === JSON.stringify(["0:1:b48cf2", "2:0:b48cf2"]) &&
      Math.abs(framed[0] - 42) < 1e-6 && Math.abs(framed[1] - 2) < 1e-6 &&
      Math.abs(framed[2]) < 1e-6);
    push("...and picks nothing and writes nothing -- the pick stays the reader's",
      (await page.evaluate(() => window.__mockWrites.length)) === 0 &&
      (await page.evaluate(() => window.__scene.highlightedFace())) === null &&
      (await overlays("picked")).length === 0);

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

// --- the top bar, the entry context and its switches ------------------------
//
// (handoff annotate_hint_bar_and_context_autofilter, 2026-09-21.) Three claims
// a DOM shim cannot answer, which is why they are here and not in
// apps/annotate/run_tests.cjs:
//
//   1. THE CANVAS IS WIDER. The hint pane was a 320px column to the right of
//      the 3D view -- Jeff, using the annotator through the flyout: "it takes
//      up half of the usable 3d canvas." That it is now a bar across the top
//      is a LAYOUT claim, measured box against box, and a class-name check
//      would pass straight through a stylesheet that still declared three
//      columns.
//   2. THE ARRIVAL REALLY APPLIES. "you already know the 3d body, the
//      topology, the study, the component, etc, so all of these should be
//      filtered automatically" -- topology and study selected, the element
//      SELECTED (not merely listed), its part alone in the scene.
//   3. THE SWITCHES REALLY SWITCH. Unticking one has to be something a reader
//      can see happen and has to survive a reload; the see-through toggle has
//      to flip what is on screen, for both entry shapes.
//
// ?mock=1 throughout, for the same reason testAnnotateRail uses it: FSA cannot
// be granted from an automated browser.
async function testAnnotateTopBar(browser, label) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}/apps/annotate/index.html`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const modelParts = () => page.locator("#parts-panel > li.part-row:not(.part-row--head)");
  const drawnAlone = async (s) => JSON.stringify(await drawnParts()) === JSON.stringify([s]);
  const drawnParts = () => page.evaluate(() => window.__scene.listOpenParts()
    .filter((s) => window.__scene.isVisible(s)).sort());
  const taskLine = () => page.locator("#detail .an__task").textContent();
  // Is the ONE installed mock part rendered translucent right now? Read off
  // the live material, not off a setting -- the whole claim of the toggle is
  // that the two agree.
  const ghosted = (sha) => page.evaluate((s) => {
    const mesh = window.__scene.parts.get(s);
    return !!(mesh && mesh.material.transparent && mesh.material.opacity < 1);
  }, sha);
  // A Display switch, addressed by the WORDS on it. It was
  // `#hint-panel input[type=checkbox]` until 2026-09-21, which worked only
  // while there was exactly one switch in the panel and became a strict-mode
  // violation the moment the face-suggestion setting joined it -- a locator
  // that depends on a panel having one control is a locator that breaks on the
  // second one.
  const setting = (label) =>
    page.locator("#hint-panel label.an__setting", { hasText: label }).locator("input");
  const openHelp = async () => {
    await page.locator("#detail .an__disclose").click();
    await page.waitForSelector("#hint-panel", { state: "visible", timeout: 5000 });
  };
  try {
    await page.evaluate(() => {}).catch(() => {});
    await page.goto(url + "?embedded=1&mock=1", { waitUntil: "load" });
    await page.waitForSelector("#element-list li.el-row", { timeout: 15000 });
    // Settings persist, so a stale run must not decide this one.
    await page.evaluate(() => {
      Object.keys(window.AnnotateApp.PREF_KEYS)
        .forEach((k) => window.localStorage.removeItem(window.AnnotateApp.PREF_KEYS[k]));
    });
    await page.goto(url + "?embedded=1&mock=1", { waitUntil: "load" });
    await page.waitForSelector("#element-list li.el-row", { timeout: 15000 });

    // --- 1. the bar is a bar ------------------------------------------------
    const rail = await page.locator(".an__rail").boundingBox();
    const bar = await page.locator(".an__hintbar").boundingBox();
    const canvas = await page.locator("#canvas-host").boundingBox();
    const viewport = page.viewportSize();
    push("the top bar spans the scene column, starting where the rail ends",
      bar && rail && Math.abs(bar.x - (rail.x + rail.width)) < 2 &&
      Math.abs((bar.x + bar.width) - viewport.width) < 2);
    push("...and the 3D canvas runs to the right edge of the window -- there " +
      "is no third column taking a slice of it",
      canvas && Math.abs((canvas.x + canvas.width) - viewport.width) < 2);
    push("...and the canvas takes most of the width, not half of it",
      canvas && canvas.width > viewport.width - rail.width - 4);
    push("the bar is ONE line at rest -- it costs a line of height, not a " +
      "third of the canvas",
      bar && bar.height < 48);
    push("the canvas starts below the bar",
      canvas && bar && canvas.y >= bar.y + bar.height - 1);
    // The renderer follows its box: the drawing buffer used to be sized once,
    // at construction, and a stale buffer puts the raycast's own NDC mapping
    // out of step with what is on screen.
    push("the WebGL canvas really is laid out at the host's width",
      Math.abs(await page.locator("#canvas-host canvas").evaluate(
        (n) => n.getBoundingClientRect().width) - canvas.width) < 2);

    // --- the help/settings panel (Jeff's "collapsible commands element") ----
    push("nothing is expanded at rest", !(await page.locator("#hint-panel").isVisible()));
    await page.locator("#detail .an__disclose").click();
    await page.waitForSelector("#hint-panel", { state: "visible", timeout: 5000 });
    const helpLines = await page.locator("#hint-panel .an__hint-lines li").count();
    push("Help opens a panel of short lines about what this surface does",
      helpLines >= 3);
    push("...and the two display switches live in it, both ticked by default",
      await setting("See-through parts").isChecked() &&
      await setting("Suggest likely faces").isChecked());
    const grewTo = (await page.locator(".an__hintbar").boundingBox()).height;
    push("...and the bar grows only while it is open", grewTo > bar.height);
    await page.locator("#detail .an__disclose").click();
    push("closing it puts the bar back to one line",
      !(await page.locator("#hint-panel").isVisible()) &&
      (await page.locator(".an__hintbar").boundingBox()).height <= bar.height + 1);

    // --- 2. arriving at an element -----------------------------------------
    const sha = await page.evaluate(() => window.AnnotateApp.FIXTURES.demoSha);
    await page.goto(url + "?embedded=1&mock=1&topology=demo_system&edge=demo_edge_untraced",
      { waitUntil: "load" });
    await page.waitForSelector("#rail-filter", { state: "visible", timeout: 15000 });
    push("the arrival selects the topology and the study it came from",
      await page.evaluate(() => window.__selection.topology === "demo_system" &&
        window.__selection.study === "demo_study"));
    push("...and SELECTS the element, rather than only listing it",
      await page.locator("#element-list li.el-row.selected").count() === 1);
    push("...and shows that element's part alone, in the scene and in the list",
      await modelParts().count() === 1 &&
      await drawnAlone(sha) &&
      await page.evaluate((s) => window.__scene.isVisible(s), sha));
    push("...and the bar tells the reader what to do, naming the element",
      /Select the remaining face that defines Demo untraced edge/.test(
        await taskLine()));
    push("...with the part see-through, so a face already bound shows through it",
      await ghosted(sha));

    // ...and it is the ARRIVAL that put the part in the scene, asked with the
    // face-suggestion display OUT OF THE WAY. Since 2026-09-21 `suggest` loads
    // the selected element's part and shows it too (cmdSuggest, app.js), so
    // with suggestions on the two are indistinguishable and the check above
    // stayed green with the arrival's own scene call deleted -- coverage lost
    // by a merge, with both branches green alone
    // (ISSUE_20260921_three_declared_mutations_are_unwitnessed_on_trunk_after_
    // the_batch_merge). The mock topology has exactly one part, so "alone"
    // cannot separate them either; turning the other loader off is what can.
    await openHelp();
    await setting("Suggest likely faces").uncheck();
    // The setting is only honoured on the next page if it reached storage
    // first, and unticking runs an async handler the click does not wait for.
    await page.waitForFunction(
      () => window.localStorage.getItem(
        window.AnnotateApp.PREF_KEYS.faceSuggestions) ===
        window.AnnotateApp.ON_OFF[1],
      null, { timeout: 5000 });
    await page.goto(url + "?embedded=1&mock=1&topology=demo_system&edge=demo_edge_untraced",
      { waitUntil: "load" });
    await page.waitForSelector("#rail-filter", { state: "visible", timeout: 15000 });
    push("...and it is the ARRIVAL that shows it, not the face suggestions — " +
      "with those off the part is in the scene all the same",
      await modelParts().count() === 1 &&
      await drawnAlone(sha) &&
      await page.evaluate((s) => window.__scene.isVisible(s), sha));
    await openHelp();
    await setting("Suggest likely faces").check();
    // Closed again: `openHelp()` below asserts the panel BECOMES visible, so a
    // panel left open would toggle it shut and time out there instead.
    await page.locator("#detail .an__disclose").click();

    // --- 3. the switches (the `auto-filter` verb: the pane has no menu) -----
    const autoFilter = (step, on) => page.evaluate(([k, v]) =>
      window.AnnotateApp.exec(["auto-filter", k, v]), [step, on ? "on" : "off"]);
    const storedSteps = () => page.evaluate(() =>
      window.AnnotateApp.readStoredAutoSteps(window.localStorage));
    push("the arrival has one switch per step: topology, study and part",
      await page.evaluate(() => window.AnnotateApp.AUTO_STEP_KEYS.join()) === "topology,study,part");

    // Parts off: the scope has to LIFT, now, not on the next launch.
    await autoFilter("part", false);
    push("turning Parts off returns the lists to manual at once",
      !(await page.locator("#rail-filter").isVisible()) &&
      await page.locator("#element-list li.el-row").count() === 3);
    const steps = await storedSteps();
    push("...and disturbs neither of the others",
      steps.topology === true && steps.study === true && steps.part === false);
    await autoFilter("part", true);
    await page.waitForSelector("#rail-filter", { state: "visible", timeout: 5000 });
    push("...and turning it back on re-applies the arrival it came from",
      await modelParts().count() === 1 &&
      await drawnAlone(sha));

    // The setting outlives the page, the way the viewer's remembered pane
    // width does.
    await autoFilter("study", false);
    await page.goto(url + "?embedded=1&mock=1&topology=demo_system&edge=demo_edge_untraced",
      { waitUntil: "load" });
    await page.waitForSelector("#element-list li.el-row", { timeout: 15000 });
    push("a switched-off step survives a reload", (await storedSteps()).study === false);
    await autoFilter("study", true);

    // See-through, on the element entry that is already on screen.
    await openHelp();
    await setting("See-through parts").uncheck();
    push("unticking See-through parts makes the body solid, now",
      !(await ghosted(sha)));
    await setting("See-through parts").check();
    push("...and ticking it puts it back", await ghosted(sha));

    // --- study scope and topology scope ------------------------------------
    await page.goto(url + "?embedded=1&mock=1&trace=1&topology=demo_system&study=demo_study",
      { waitUntil: "load" });
    await page.waitForFunction(() => window.__lastTrace !== undefined, null,
      { timeout: 15000 });
    push("a study-scope entry shows only that study's parts, see-through, " +
      "with its bound faces marked",
      await modelParts().count() === 1 &&
      await drawnAlone(sha) && await ghosted(sha) &&
      await page.evaluate(() => window.__scene.listMarks().length) === 1);
    const scopeNote = await page.locator(".an__filter-note").textContent();
    push("...and the rail says which study it is scoped to, by its title",
      /Showing only/.test(scopeNote || "") && /Demo study/.test(scopeNote || ""));
    await openHelp();
    await setting("See-through parts").uncheck();
    push("the see-through switch flips a scope entry too, not just an element one",
      !(await ghosted(sha)));
    await setting("See-through parts").check();

    await page.goto(url + "?embedded=1&mock=1&trace=1&topology=demo_system", { waitUntil: "load" });
    await page.waitForFunction(() => window.__lastTrace !== undefined, null,
      { timeout: 15000 });
    const topoTrace = await page.evaluate(() => window.__lastTrace);
    push("a TOPOLOGY-scope entry works with no study named at all",
      topoTrace.studyId === null &&
      await page.locator("#element-list li.el-row").count() === 3 &&
      await ghosted(sha));
    push("...and the rail names the topology it is scoped to",
      /Demo mechanism/.test(await page.locator(".an__filter-note").textContent() || ""));

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

// --- the scene pane reads over HTTP (handoff the_scene_pane_is_one_flyout_
// that_reads_over_http) ------------------------------------------------------
//
// drawing-checker's mounts, reproduced (webui/analyses.py's tolstack_mounts):
// the two apps as siblings under /tolstack/, the meshes at /tolstack/data/
// meshes/ registered BEFORE /tolstack/data/, which is the viewer projection
// dir and nothing else. No ?mock=1, no patched reads, no folder grant: the
// annotator in the pane reads what this origin serves, exactly as Jeff opens
// it on 127.0.0.1:8000.
// A suggestion names its face, and the mate ranks the other side (handoff
// a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates,
// 2026-11-15), on model v2 with the real served log and the real meshes --
// writes go to the pane's in-memory store, never to the folder. The
// tangential link mount's base face carries an open proposal: its line names
// the face, hovering lights it, Take writes one accept for the surest. The
// hub's blade-1 bore, armed, ranks its faces against the blade's bound seat:
// the hub's own two faces of that bore head the list and are pre-lit. A
// feature with nothing bound opposite arms as it always has.
async function testSuggestionNamesItsFace(browser, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const V2 = "vpa_end_stop_v2";
  const MOUNT_FACE = "tan_link_mount_215175_002@tan_link_mount_hub_face";
  const HUB_BORE = "hub@hub_blade1_root_bearing_bore";
  const LONE = "piston_cover_214958_002@piston_cover_end_stop_shoulder";
  const KINEMATIC = "vpa_pitch_linkage_blade_pitch_at_the_stops";
  const servedLog = await readProjection("feature-identity/log.json");
  const v2 = topologies && (topologies.topologies || []).find((t) => t.id === V2);
  const events = (servedLog && servedLog.events) || [];
  const faceKeys = (e) => (e.geometry_keys || (e.geometry_key ? [e.geometry_key] : []));
  // The hub bore's standing faces in the log: the ranking's expected head.
  const hubBound = events.filter((e) => e.verdict === "bound" && e.feature_key &&
    e.feature_key.part === "hub" && e.feature_key.node === "hub_blade1_root_bearing_bore").pop();
  const bladeBound = events.some((e) => e.verdict === "bound" && e.feature_key &&
    e.feature_key.part === "blade_root" && e.feature_key.node === "hub_blade1_root_bearing_bore");
  if (!v2 || !hubBound || !bladeBound) {
    push("[real] a suggestion names its face and the mate ranks the other side (skipped: model v2, " +
      "or the blade-1 bore bound on both sides in the served log, is not on disk -- build them, or " +
      "pass --repo <main checkout>)", true);
    return reportSuite(label, checks, errors);
  }
  const index = await realDataIndexForTheAnnotator();
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await installRealAnnotatorReads(page, { meshes: index.meshes, runs: index.runs, aliases: index.aliases,
    binding: "real" });
  const inPane = (fn, arg) => page.evaluate(({ src, arg }) => {
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    if (!w || !w.document) return null;
    return new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
  }, { src: fn.toString(), arg });
  const until = async (fn, arg, timeout = 60000) => {
    try {
      await page.waitForFunction(({ src, arg }) => {
        const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
        if (!w || !w.document) return false;
        return !!new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
      }, { src: fn.toString(), arg }, { timeout, polling: 100 });
      return true;
    } catch {
      return false;
    }
  };
  // What the pane holds, named in the message of every precondition that is missing.
  const paneState = () => inPane((w) => ({
    open: w.__scene ? w.__scene.listOpenParts().length : null,
    sweepBodies: w.__sweep && w.__sweep.bodies ? w.__sweep.bodies.length : null })).catch((e) => String(e));
  // A precondition the checks stand on. A missing one is printed by name with
  // the pane's state and the checks that read it go red -- never thrown: a
  // thrown error aborts the suite before those checks are pushed, and the
  // mutation-witness runner then reports a guard it never reached.
  const need = async (what, fn, arg, timeout) => {
    if (await until(fn, arg, timeout)) return true;
    console.log(`    MISSING: ${what} (after ${timeout} ms; pane ${JSON.stringify(await paneState())})`);
    return false;
  };
  // A twisty is clicked until the page reports it expanded: a click on a tree
  // that is still repainting lands on a node that is then replaced, so the
  // state is read back, never assumed. A click that never takes is the error.
  const expand = async (key, what) => {
    const sel = `#navtree [data-nav-twisty="${key}"]`;
    const isOpen = (s) => { const t = document.querySelector(s); return !!t && t.getAttribute("aria-expanded") === "true"; };
    const there = await page.waitForSelector(sel, { state: "attached", timeout: 30000 }).then(() => true, () => false);
    if (!there) return console.log(`    MISSING: the twisty of ${what} (${key}) is not in the tree`);
    for (let i = 0; i < 5; i++) {
      if (await page.evaluate(isOpen, sel)) return;
      await page.evaluate((s) => { const t = document.querySelector(s); if (t) t.click(); }, sel);
      await page.waitForFunction(isOpen, sel, { timeout: 3000 }).catch(() => {});
    }
    if (!(await page.evaluate(isOpen, sel))) console.log(`    MISSING: ${what} (${key}) never expanded`);
  };
  const openBody = async (fid) => {
    await expand(`p:${fid.split("@")[0]}`, `the part of ${fid}`);
    await expand(`f:${fid}`, `the feature ${fid}`);
  };
  const slotOf = (fid) => page.locator(`#navtree [data-nav-kind="feature"][data-nav-id="${fid}"]`)
    .locator("xpath=..").locator(".navtree__scene").first();
  // `settled`: a study's page opens its parts one by one after the tree is up,
  // and each repaint of the tree can replace the nodes a click or a hover just
  // found, so the sweep is waited out (it has opened every part it will) before
  // the first click.
  const openPage = async (query, settled) => {
    await page.goto(url + "/apps/viewer/topology.html?" + query, { waitUntil: "load" });
    await page.waitForSelector("#pane-handle:visible", { timeout: 30000 }).catch(() => {});
    await page.locator("#pane-handle").click({ timeout: 10000 }).catch(() => {});
    await need("the pane's embedded tree", (w) => !!w.__embedTree, null, 120000);
    if (settled) await need("the sweep to finish opening its parts", (w) => !!(w.__sweep && w.__sweep.bodies), null, 180000);
  };
  try {
    // 1. The mount's base face where Jeff met it, on the kinematic page: the
    // run's joints do not include it, so the pane lists no row for it and the
    // tree's own line is its body. The line names the surest proposal's face.
    // (On v2 with no study the pane lists a row for it, and the body is that
    // row, its mates among the row's candidates -- the 2026-11-15 review's B1.)
    await openPage("kinematic=" + KINEMATIC, true);
    await openBody(MOUNT_FACE);
    const line = slotOf(MOUNT_FACE).locator(".navtree__featurestate[data-look]").first();
    await line.waitFor({ timeout: 30000 }).catch(() =>
      console.log("    MISSING: the mount's suggestion line, with its part and feature both expanded"));
    const face = Number(await line.getAttribute("data-face", { timeout: 1000 }).catch(() => NaN));
    const surest = events.filter((e) => e.verdict === "proposed" &&
      faceKeys(e).some((k) => k.face_id === face)).find((e) => e.confidence === "high");
    console.log(`    the mount's suggestion line names face ${face}; surest proposal ${surest && surest.event_id}`);
    // The sweep opens its parts one by one after the tree is up, and only an
    // open part washes in sweep mode: hover once the mount is drawn.
    const mountSha = surest && faceKeys(surest)[0].source_step_sha256;
    if (!surest) console.log(`    MISSING: a high-confidence proposal in the log for face ${face}`);
    else await need("the mount's part drawn in the pane", (w, s) => w.__scene && w.__scene.listOpenParts().indexOf(s) !== -1, mountSha, 60000);
    // A hover that lands while the line is being replaced lights nothing: leave
    // and rest on it again until the pane washes the face.
    let washed = false;
    for (let i = 0; i < 4 && !washed; i++) {
      await page.mouse.move(2, 2);
      await line.hover({ timeout: 5000 }).catch(() => {});
      washed = await until((w, f) => w.__lastWash && w.__lastWash.faceId === f, face, 4000);
    }
    push("[real] hovering a suggestion line in the tree lights its face in the pane",
      Number.isFinite(face) && washed);
    const before = await inPane((w) => (w.__mockWrites || []).length);
    const take = slotOf(MOUNT_FACE).locator("button", { hasText: "Take" }).first();
    await take.waitFor({ timeout: 15000 }).catch(() => console.log("    MISSING: the Take button under the mount's line"));
    await take.click({ timeout: 5000 }).catch(() => {});
    await until((w, n) => (w.__mockWrites || []).length > n, before, 30000);
    await page.waitForTimeout(500);
    const written = (await inPane((w, n) => (w.__mockWrites || []).slice(n)
      .map((x) => ({ verdict: x.event.verdict, ratifies: x.event.ratifies || null,
        faces: (x.event.geometry_keys || [x.event.geometry_key]).map((k) => k && k.face_id) })), before)) || [];
    console.log(`    Take wrote ${JSON.stringify(written)}`);
    push("[real] Take on a suggestion line writes one accept event, for the surest proposal and its face",
      written.length === 1 && written[0].verdict === "bound" && !!surest &&
      written[0].ratifies === surest.event_id && written[0].faces[0] === face);

    // 2. The hub's blade-1 bore on v2, armed: ranked against the blade's bound
    // seat (a fresh page: the Take above wrote to the first page's store only).
    await openPage("topology=" + V2);
    await openBody(HUB_BORE);
    await slotOf(HUB_BORE).locator('button[data-body-act="arm"]').first().click({ timeout: 10000 }).catch(() => {});
    const want = faceKeys(hubBound).map((k) => k.face_id).sort((a, b) => a - b);
    const ranked = await until((w) => w.__armedMates && w.__armedMates.length, null, 120000)
      ? await inPane((w) => ({ head: w.__armedMates.slice(0, 2).map((f) => f.faceId).sort((a, b) => a - b),
        all: w.__armedMates.map((f) => f.faceId),
        lit: w.__scene.listMarks("suggested").map((m) => m.faceId) })) : null;
    await page.waitForFunction((sel) => document.querySelectorAll(sel).length > 1,
      `#navtree [data-nav-id="${HUB_BORE}"] ~ .navtree__scene .navtree__featurebody[data-body-kind="armed"] .navtree__featurestate`,
      { timeout: 15000 }).catch(() => {});
    const listed = await slotOf(HUB_BORE).locator(".navtree__featurestate[data-face]").evaluateAll((rows) =>
      rows.map((r) => ({ face: Number(r.getAttribute("data-face")),
        why: (r.querySelector(".navtree__featuresub") || {}).textContent || "" }))).catch(() => []);
    console.log(`    armed hub bore: ranked ${JSON.stringify(ranked && ranked.all.slice(0, 8))}; ` +
      `listed ${JSON.stringify(listed.slice(0, 3))}`);
    push("[real] arming a side whose counterpart is bound pre-lights the faces that mate with it, " +
      "headed by the true mate, and lists them under the feature with why each is there",
      !!ranked && JSON.stringify(ranked.head) === JSON.stringify(want) &&
      want.every((f) => ranked.lit.indexOf(f) !== -1) && ranked.all.indexOf(2564) === -1 &&
      listed.length >= 2 && want.indexOf(listed[0].face) !== -1 && /^coaxial with /.test(listed[0].why));
    await page.keyboard.press("Escape");
    push("[real] ...and ending the pick takes the pre-lit faces down",
      await until((w) => !w.__embedTree.armed && w.__scene.listMarks("suggested").length === 0, null, 15000));

    // 3. Nothing bound opposite: the arm is what it always was.
    await openBody(LONE);
    await slotOf(LONE).locator('button[data-body-act="arm"]').first().click({ timeout: 10000 }).catch(() => {});
    const armedLone = await until((w) => w.__embedTree && w.__embedTree.armed, null, 60000);
    await page.waitForTimeout(3000);
    const lone = await inPane((w) => ({ mates: (w.__armedMates || []).length,
      lit: w.__scene.listMarks("suggested").length,
      inTree: Object.keys((w.__embedTree && w.__embedTree.mates) || {}) }));
    await slotOf(LONE).locator('.navtree__featurebody[data-body-kind="armed"]').first()
      .waitFor({ timeout: 15000 }).catch(() => {});
    const loneLines = await slotOf(LONE).locator(".navtree__featurestate").count().catch(() => -1);
    console.log(`    armed with nothing bound opposite: ${JSON.stringify(lone)}, ${loneLines} line(s)`);
    if (loneLines !== 1) console.log("      DIAG " + await page.evaluate((id) => { const r = document.querySelector(`#navtree [data-nav-id="${id}"]`); return r ? (r.parentElement.outerHTML || "").slice(0, 900) : "no row"; }, LONE));
    push("[real] arming a side with nothing bound opposite ranks nothing, lights nothing and lists only the pick's line",
      armedLone && !!lone && lone.mates === 0 && lone.lit === 0 && lone.inTree.indexOf(LONE) === -1 && loneLines === 1);
    await page.keyboard.press("Escape");
    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.close();
  }
}

// A press that writes says so at once (handoff a_bind_on_the_pitch_plate_
// writes_in_seconds_and_says_so_while_it_waits, 2026-11-19), on model v1 with
// the real served log and the real meshes -- writes go to the pane's
// in-memory store, never to the folder. The pitch plate's link bore holds two
// sets that disagree (Jeff's events 0093-0100); Keep on "faces 1380, 1381"
// reads pending in the frame of the press, writes one event, and the body
// reads bound. The press -> event and press -> body times are PRINTED, never
// asserted: this tier runs under load (the per-step table is the probe's,
// tests/debug_bind_latency_20261119.mjs, on a scratch copy of the folder).
async function testAPressThatWritesSaysSo(browser, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const V1 = "vpa_pitch_linkage";
  const BORE = "pitch_plate_215177_001@pitch_plate_link_attach_bore";
  const servedLog = await readProjection("feature-identity/log.json");
  const events = (servedLog && servedLog.events) || [];
  const faceKeys = (e) => (e.geometry_keys || (e.geometry_key ? [e.geometry_key] : []));
  const boreSets = new Set(events.filter((e) => e.verdict === "bound" && e.feature_key &&
    e.feature_key.part === "pitch_plate_215177_001" && e.feature_key.node === "pitch_plate_link_attach_bore")
    .map((e) => faceKeys(e).map((k) => k.face_id).sort((a, b) => a - b).join(",")));
  const v1 = topologies && (topologies.topologies || []).find((t) => t.id === V1);
  if (!v1 || !boreSets.has("1380,1381") || boreSets.size < 2) {
    push("[real] a press that writes says so at once (skipped: model v1, or the pitch plate bore's " +
      "two disagreeing sets in the served log, is not on disk -- build them, or pass --repo <main checkout>)", true);
    return reportSuite(label, checks, errors);
  }
  const index = await realDataIndexForTheAnnotator();
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await installRealAnnotatorReads(page, { meshes: index.meshes, runs: index.runs, aliases: index.aliases,
    binding: "real" });
  const inPane = (fn, arg) => page.evaluate(({ src, arg }) => {
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    if (!w || !w.document) return null;
    return new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
  }, { src: fn.toString(), arg });
  const until = async (fn, arg, timeout = 60000) => {
    try {
      await page.waitForFunction(({ src, arg }) => {
        const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
        if (!w || !w.document) return false;
        return !!new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
      }, { src: fn.toString(), arg }, { timeout, polling: 100 });
      return true;
    } catch {
      return false;
    }
  };
  // A twisty is clicked until the page reports it expanded (a repaint can
  // replace the node a click found); an absent one is printed, never thrown.
  const expand = async (key) => {
    const sel = `#navtree [data-nav-twisty="${key}"]`;
    const isOpen = (s) => { const t = document.querySelector(s); return !!t && t.getAttribute("aria-expanded") === "true"; };
    if (!(await page.locator(sel).count())) return;
    for (let i = 0; i < 5; i++) {
      if (await page.evaluate(isOpen, sel)) return;
      await page.evaluate((s) => { const t = document.querySelector(s); if (t) t.click(); }, sel);
      await page.waitForFunction(isOpen, sel, { timeout: 3000 }).catch(() => {});
    }
  };
  try {
    await page.goto(url + "/apps/viewer/topology.html?topology=" + V1, { waitUntil: "load" });
    await page.waitForSelector("#pane-handle:visible", { timeout: 30000 }).catch(() => {});
    await page.locator("#pane-handle").click({ timeout: 10000 }).catch(() => {});
    if (!(await until((w) => !!w.__embedTree, null, 120000))) console.log("    MISSING: the pane's embedded tree");
    for (const key of ["bi:pitch_plate", "p:pitch_plate_215177_001", `f:${BORE}`]) await expand(key);
    const disagree = await page.waitForFunction((id) => {
      const row = document.querySelector(`#navtree [data-nav-kind="feature"][data-nav-id="${id}"]`);
      return !!(row && row.parentElement.querySelector('.navtree__featurebody[data-body-kind="disagree"]'));
    }, BORE, { timeout: 30000 }).then(() => true, () => false);
    if (!disagree) console.log("    MISSING: the bore's body reading its two sets disagreeing");
    const before = (await inPane((w) => (w.__mockWrites || []).length)) || 0;
    // Pressed in the page, and read one frame later: the frame a reader sees.
    const atOnce = await page.evaluate(async (id) => {
      const row = document.querySelector(`#navtree [data-nav-kind="feature"][data-nav-id="${id}"]`);
      const slot = row && row.parentElement.querySelector(".navtree__scene");
      const line = slot && Array.from(slot.querySelectorAll(".navtree__featurestate"))
        .find((l) => (l.querySelector(".navtree__featurewords") || {}).textContent === "faces 1380, 1381");
      const acts = line && line.nextElementSibling;
      const keep = acts && Array.from(acts.querySelectorAll("button")).find((b) => b.textContent === "Keep");
      if (!keep) return null;
      keep.click();
      window.__pressT0 = performance.now();
      window.__bodyAt = null;
      const obs = new MutationObserver(() => {
        const body = slot.querySelector(".navtree__featurebody");
        if (window.__bodyAt === null && body && body.getAttribute("data-body-kind") === "bound") {
          window.__bodyAt = performance.now();
          obs.disconnect();
        }
      });
      obs.observe(slot, { subtree: true, childList: true, attributes: true });
      await new Promise((r) => requestAnimationFrame(() => r()));
      const now = slot.querySelector("[data-pending]") || keep;
      return { text: now.textContent, disabled: !!now.disabled, pending: now.getAttribute("data-pending"),
        others: Array.from(slot.querySelectorAll('button[data-body-act="keep"], button[data-body-act="unbind"]'))
          .filter((b) => b !== now).map((b) => !!b.disabled) };
    }, BORE);
    console.log(`    one frame after Keep: ${JSON.stringify(atOnce)}`);
    push("[real] Keep on the pitch plate's link bore reads writing and is disabled in the frame of the " +
      "press, and the other writing controls wait",
      !!atOnce && atOnce.text === "writing…" && atOnce.disabled && atOnce.pending === "writing" &&
      atOnce.others.length > 0 && atOnce.others.every(Boolean));
    await until((w, n) => (w.__mockWrites || []).length > n, before, 120000);
    const wroteAt = await page.evaluate(() => performance.now() - window.__pressT0);
    await page.waitForFunction(() => window.__bodyAt !== null, null, { timeout: 60000 }).catch(() => {});
    const timing = await page.evaluate(() => ({ body: window.__bodyAt === null ? null : Math.round(window.__bodyAt - window.__pressT0) }));
    const written = (await inPane((w, n) => (w.__mockWrites || []).slice(n).map((x) => ({ verdict: x.event.verdict,
      faces: (x.event.geometry_keys || [x.event.geometry_key]).map((k) => k && k.face_id) })), before)) || [];
    const steps = await inPane((w) => w.__writeSteps || null);
    console.log(`    TIMING pitch plate Keep: press -> event ${Math.round(wroteAt)} ms, press -> body ` +
      `${timing.body} ms (in-memory store; printed, not asserted); steps ${JSON.stringify(steps && steps.steps)}`);
    const body = await page.evaluate((id) => {
      const row = document.querySelector(`#navtree [data-nav-kind="feature"][data-nav-id="${id}"]`);
      const slot = row && row.parentElement.querySelector(".navtree__scene");
      return slot ? { kind: (slot.querySelector(".navtree__featurebody") || { getAttribute: () => null }).getAttribute("data-body-kind"),
        pending: slot.querySelectorAll("[data-pending]").length + slot.querySelectorAll("button:disabled").length } : null;
    }, BORE);
    push("[real] ...it writes one event holding faces 1380 and 1381, the body then reads bound, and " +
      "nothing is left pending",
      written.length === 1 && written[0].verdict === "bound" &&
      JSON.stringify(written[0].faces.slice().sort((a, b) => a - b)) === "[1380,1381]" &&
      !!body && body.kind === "bound" && body.pending === 0 && timing.body !== null);
    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.close();
  }
}

// A pattern is bound as its like faces, and a face can be added (handoff
// a_pattern_is_bound_as_its_like_faces_and_a_face_can_be_added, 2026-11-15),
// on model v2 with the real served log and the real meshes -- writes go to
// the pane's in-memory store, never to the folder. Correct on the hub's
// fastener clocking and a click on face 744 offers the ten holes of the bolt
// circle, lit; Take all writes them as one event and the body and the Preview
// read the fit back. Add a face grows the pilot's set by one click and ends
// the pick; Shift-click builds a set on an unbound feature and keeps it;
// Remove takes a face back out. The Parts filter's count is the model's
// unbound features and drops by one when one is bound.
async function testPatternAndAddAFace(browser, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const V2 = "vpa_end_stop_v2";
  const HUB = "e28285d1e6c934504d7c1dd0b86814cda6e256c3a18b2bbc4b6ee26cf6ceab6b";
  const CLOCKING = "hub@tan_link_mount_fastener_clocking";
  // The hub's locating boss: bound through old edge-end events (the v2 pilot
  // fit's, face 144), read through to the feature.
  const PILOT = "hub@hub_spindle_bore_axis";
  const LONE = "piston_cover_214958_002@piston_cover_end_stop_shoulder";
  const servedLog = await readProjection("feature-identity/log.json");
  const v2 = topologies && (topologies.topologies || []).find((t) => t.id === V2);
  const events = (servedLog && servedLog.events) || [];
  const boundAt = (part, node) => events.filter((e) => e.verdict === "bound" && e.feature_key &&
    e.feature_key.part === part && e.feature_key.node === node).pop();
  const clocking = boundAt("hub", "tan_link_mount_fastener_clocking");
  const pilot = events.some((e) => e.verdict === "bound" && e.stack_key &&
    e.stack_key.edge_id === "hub_boss_in_tan_link_mount_pilot");
  if (!v2 || !clocking || !pilot || !existsSync(join(DATA_REPO, "data", "meshes", HUB, "manifest.json"))) {
    push("[real] a pattern is bound as its like faces and a face can be added (skipped: model v2, the hub " +
      "mesh, or the clocking and the pilot bound in the served log, is not on disk -- build them, or pass " +
      "--repo <main checkout>)", true);
    return reportSuite(label, checks, errors);
  }
  const index = await realDataIndexForTheAnnotator();
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await installRealAnnotatorReads(page, { meshes: index.meshes, runs: index.runs, aliases: index.aliases,
    binding: "real" });
  const inPane = (fn, arg) => page.evaluate(({ src, arg }) => {
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    if (!w || !w.document) return null;
    return new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
  }, { src: fn.toString(), arg });
  const until = async (fn, arg, timeout = 60000) => {
    try {
      await page.waitForFunction(({ src, arg }) => {
        const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
        if (!w || !w.document) return false;
        return !!new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
      }, { src: fn.toString(), arg }, { timeout, polling: 100 });
      return true;
    } catch {
      return false;
    }
  };
  const row = (fid) => `#navtree [data-nav-kind="feature"][data-nav-id="${fid}"]`;
  const openBody = async (fid) => {
    const part = fid.split("@")[0];
    if (!(await page.locator(row(fid)).count())) {
      await page.locator(`#navtree [data-nav-twisty="p:${part}"]`).first().click({ timeout: 5000 }).catch(() => {});
    }
    const twisty = page.locator(`#navtree [data-nav-twisty="f:${fid}"]`).first();
    if (await twisty.count() && (await twisty.getAttribute("aria-expanded")) !== "true") {
      await twisty.click({ timeout: 5000 }).catch(() => {});
    }
  };
  const slotOf = (fid) => page.locator(row(fid)).locator("xpath=..").locator(".navtree__scene").first();
  const lines = (fid) => slotOf(fid).locator(".navtree__featurestate").evaluateAll((rows) => rows.map((r) =>
    ((r.querySelector(".navtree__featurewords") || {}).textContent || "") +
    (r.getAttribute("data-fit") ? " [fit]" : ""))).catch(() => []);
  const writes = () => inPane((w) => (w.__mockWrites || []).length);
  const writtenSince = (n) => inPane((w, n) => (w.__mockWrites || []).slice(n).map((x) => ({
    verdict: x.event.verdict, supersedes: x.event.supersedes || null,
    faces: (x.event.geometry_keys || [x.event.geometry_key]).map((k) => k && k.face_id) })), n);
  // A click in the scene on a face of the armed part, as the scene hands it
  // over after the filtered ray (scene.js's pointerup) -- Shift with it.
  const clickFace = (sha, faceId, shift) => inPane((w, a) => {
    w.__scene.onPick({ sha256: a.sha, faceId: a.faceId }, null, null, { shift: a.shift });
    return true;
  }, { sha, faceId, shift: !!shift });
  const armedSha = () => inPane((w) => (w.__scene.pickFilter() || [])[0] || null);
  try {
    await page.goto(url + "/apps/viewer/topology.html?topology=" + V2, { waitUntil: "load" });
    await page.waitForSelector("#pane-handle:visible", { timeout: 30000 }).catch(() => {});
    await page.locator("#pane-handle").click({ timeout: 10000 }).catch(() => {});
    await until((w) => !!w.__embedTree, null, 120000);

    // --- the Parts filter, before anything is written ------------------------
    const filterCount = () => page.locator("#navtree [data-nav-filter-count]").first().textContent()
      .then(Number).catch(() => NaN);
    // The fold's answer, read off every feature row's mark with every part open.
    const openAll = async () => {
      for (let i = 0; i < 4; i++) {
        const closed = page.locator('#navtree [data-nav-twisty^="p:"][aria-expanded="false"]');
        const n = await closed.count();
        if (!n) return;
        for (let k = n - 1; k >= 0; k--) await closed.nth(k).click({ timeout: 2000 }).catch(() => {});
      }
    };
    const rowsNotBound = () => page.evaluate(() => Array.from(document.querySelectorAll('#navtree [data-nav-kind="feature"]'))
      .filter((r) => r.querySelector(".navtree__mark").getAttribute("data-status") !== "bound")
      .map((r) => r.getAttribute("data-nav-id")));
    await openAll();
    const unbound0 = new Set(await rowsNotBound());
    const count0 = await filterCount();
    console.log(`    filter count ${count0}; feature rows not bound under Parts ${unbound0.size}`);
    if (count0 !== unbound0.size) {
      console.log("    DIAG rows: " + JSON.stringify(await page.evaluate(() => ({
        twisties: Array.from(document.querySelectorAll('#navtree [data-nav-twisty^="p:"]'))
          .map((b) => b.getAttribute("data-nav-twisty") + "=" + b.getAttribute("aria-expanded")),
        features: Array.from(document.querySelectorAll('#navtree [data-nav-kind="feature"]'))
          .map((r) => r.getAttribute("data-nav-id")) }))));
    }
    push("[real] the Parts filter's count is the number of the model's features not bound",
      Number.isFinite(count0) && count0 === unbound0.size && count0 > 0);
    await page.locator('#navtree [data-nav-filter="unbound"]').first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    const shown = await page.evaluate(() => Array.from(document.querySelectorAll('#navtree .navtree__section--bodies [data-nav-kind="feature"], #navtree .navtree__section--parts [data-nav-kind="feature"]'))
      .map((r) => ({ id: r.getAttribute("data-nav-id"), status: r.querySelector(".navtree__mark").getAttribute("data-status") })));
    push("[real] Unbound lists no bound feature under Parts, and nothing else on the page moved",
      shown.length > 0 && shown.every((s) => s.status !== "bound") &&
      await page.locator(".detail__preview").getAttribute("data-preview-state").catch(() => null) === "empty");
    await page.locator('#navtree [data-nav-filter="all"]').first().click({ timeout: 5000 }).catch(() => {});

    // --- the pattern ---------------------------------------------------------
    await openBody(CLOCKING);
    await slotOf(CLOCKING).locator("button", { hasText: "Correct" }).first().click({ timeout: 10000 }).catch(() => {});
    await until((w) => w.__embedTree && w.__embedTree.armed && w.__scene.pickFilter(), null, 60000);
    await until((w, s) => !!w.__scene.faceRecord(s, 744), HUB, 60000);
    let before = await writes();
    await clickFace(HUB, 744, false);
    await until((w) => !!w.document.querySelector("#an-offer.an__offer--on"), null, 120000);
    const offer = await inPane((w) => {
      const n = w.document.querySelector("#an-offer.an__offer--on");
      return n ? { line: n.querySelector(".an__offer-line").textContent,
        buttons: Array.from(n.querySelectorAll("button")).map((b) => b.textContent),
        lit: w.__groupOffer ? w.__groupOffer.faces.length : null,
        tinted: w.__groupOffer ? w.__groupOffer.tinted : null,
        armed: !!w.__embedTree.armed } : null;
    });
    console.log(`    clicking face 744: ${JSON.stringify(offer)}`);
    push("[real] a click on face 744 offers the bolt circle's ten holes, every face of them lit, writing nothing",
      !!offer && offer.line === "10 like holes on one plane" && offer.buttons[0] === "Take all 10 holes" &&
      offer.lit === 20 && offer.tinted === 20 && offer.armed && (await writes()) === before);
    await page.frameLocator("#annotate-flyout iframe").locator('#an-offer [data-offer="all"]').click({ timeout: 5000 }).catch(() => {});
    await until((w, n) => (w.__mockWrites || []).length > n, before, 60000);
    const took = await writtenSince(before);
    console.log(`    Take all wrote ${JSON.stringify(took)}`);
    push("[real] Take all writes one binding holding all twenty faces, superseding the one-hole binding",
      took.length === 1 && took[0].verdict === "bound" && took[0].faces.length === 20 &&
      took[0].faces.indexOf(744) !== -1 && took[0].supersedes === clocking.event_id);
    await page.waitForFunction((sel) => Array.from(document.querySelectorAll(sel)).some((n) => n.getAttribute("data-fit")),
      row(CLOCKING) + " ~ .navtree__scene .navtree__featurestate", { timeout: 120000 }).catch(() => {});
    const body = await lines(CLOCKING);
    console.log(`    the clocking's body: ${JSON.stringify(body.slice(0, 3))} ...`);
    push("[real] the body reads the set and its fit in one line: \"10 holes Ø5.5 on a Ø240 circle\"",
      /^bound · 20 faces of /.test(body[0] || "") && body[1] === "10 holes Ø5.5 on a Ø240 circle [fit]");
    await page.locator(row(CLOCKING)).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    const preview = await page.locator(".detail__preview [data-fit]").allTextContents().catch(() => []);
    push("[real] ...and so does the Preview, with the feature selected",
      preview.length === 1 && preview[0] === "10 holes Ø5.5 on a Ø240 circle");

    // --- Add a face ------------------------------------------------------------
    await openBody(PILOT);
    await slotOf(PILOT).locator(".navtree__featurestate").first().waitFor({ timeout: 30000 }).catch(() => {});
    const held = await slotOf(PILOT).evaluate((slot) => {
      const faces = Array.from(slot.querySelectorAll(".navtree__featurestate[data-face]")).map((r) => Number(r.getAttribute("data-face")));
      return faces;
    }).catch(() => []);
    await slotOf(PILOT).locator("button", { hasText: "Add a face" }).first().click({ timeout: 10000 }).catch(() => {});
    await until((w) => w.__embedTree && w.__embedTree.armed, null, 60000);
    const addLine = await inPane((w) => w.__embedTree.armedLine);
    const extra = held.indexOf(0) === -1 ? 0 : 1;
    before = await writes();
    await clickFace(HUB, extra, false);
    await until((w, n) => (w.__mockWrites || []).length > n, before, 60000);
    const added = await writtenSince(before);
    const addedArmed = await inPane((w) => !!w.__embedTree.armed);
    console.log(`    Add a face (line ${JSON.stringify(addLine)}) wrote ${JSON.stringify(added)}; armed after: ${addedArmed}`);
    push("[real] Add a face arms a pick that adds: one click writes the set with the face added and ends the pick",
      addLine === "adding a face to the feature" && added.length === 1 && added[0].verdict === "bound" &&
      held.every((f) => added[0].faces.indexOf(f) !== -1) && added[0].faces.indexOf(extra) !== -1 &&
      held.length > 0 && !addedArmed);
    await page.waitForFunction((sel) => /faces of/.test((document.querySelector(sel) || {}).textContent || ""),
      row(PILOT) + " ~ .navtree__scene .navtree__featurewords", { timeout: 60000 }).catch(() => {});
    before = await writes();
    await slotOf(PILOT).locator(`.navtree__featurestate[data-face="${extra}"] + .navtree__featureacts button`, { hasText: "Remove" })
      .first().click({ timeout: 10000 }).catch(() => {});
    await until((w, n) => (w.__mockWrites || []).length > n, before, 60000);
    const removed = await writtenSince(before);
    push("[real] ...and Remove on that face writes the set without it",
      removed.length === 1 && removed[0].faces.indexOf(extra) === -1 &&
      held.every((f) => removed[0].faces.indexOf(f) !== -1));

    // --- Shift-click on an unbound feature, and the filter's count ------------
    await openBody(LONE);
    await slotOf(LONE).locator('button[data-body-act="arm"]').first().click({ timeout: 10000 }).catch(() => {});
    await until((w) => w.__embedTree && w.__embedTree.armed && w.__scene.pickFilter(), null, 60000);
    const cover = await armedSha();
    before = await writes();
    await clickFace(cover, 0, true);
    await until((w, n) => (w.__mockWrites || []).length > n, before, 60000);
    const first = await writtenSince(before);
    const afterOne = await inPane((w) => ({ armed: !!w.__embedTree.armed, line: w.__embedTree.armedLine }));
    const firstFaces = first.length ? first[first.length - 1].faces : [];
    let other = 1;
    while (firstFaces.indexOf(other) !== -1) other += 1;
    before = await writes();
    await clickFace(cover, other, true);
    await until((w, n) => (w.__mockWrites || []).length > n, before, 60000);
    const second = await writtenSince(before);
    const afterTwo = await inPane((w) => ({ armed: !!w.__embedTree.armed, line: w.__embedTree.armedLine }));
    console.log(`    Shift-click 0: ${JSON.stringify(first)} ${JSON.stringify(afterOne)}; ` +
      `Shift-click ${other}: ${JSON.stringify(second)} ${JSON.stringify(afterTwo)}`);
    push("[real] Shift-click on an unbound feature binds the face and keeps the pick; a second adds to the set, still armed",
      first.length >= 1 && first[first.length - 1].verdict === "bound" && firstFaces.indexOf(0) !== -1 &&
      afterOne.armed && /^added face 0 · /.test(afterOne.line || "") &&
      second.length === 1 && second[0].faces.indexOf(other) !== -1 &&
      firstFaces.every((f) => second[0].faces.indexOf(f) !== -1) &&
      afterTwo.armed && afterTwo.line === `added face ${other} · ${second[0].faces.length} faces`);
    await page.keyboard.press("Escape");
    await until((w) => !w.__embedTree.armed, null, 15000);
    await page.waitForFunction((sel) => /faces of/.test((document.querySelector(sel) || {}).textContent || ""),
      row(LONE) + " ~ .navtree__scene .navtree__featurewords", { timeout: 60000 }).catch(() => {});
    const count1 = await filterCount();
    console.log(`    filter count after binding the shoulder: ${count1} (was ${count0})`);
    push("[real] binding one feature drops the filter's count by one",
      unbound0.has(LONE) && count1 === count0 - 1);
    before = await writes();
    await slotOf(LONE).locator(`.navtree__featurestate[data-face="${other}"] + .navtree__featureacts button`, { hasText: "Remove" })
      .first().click({ timeout: 10000 }).catch(() => {});
    await until((w, n) => (w.__mockWrites || []).length > n, before, 60000);
    const dropped = await writtenSince(before);
    push("[real] ...and Remove takes the Shift-clicked face back out of that set",
      dropped.length === 1 && dropped[0].faces.indexOf(other) === -1 && dropped[0].faces.indexOf(0) !== -1);
  } catch (err) {
    errors.push(String(err));
  } finally {
    await page.close();
    server.close();
  }
  return reportSuite(label, checks, errors);
}

// Handoff a_bound_pattern_offers_the_whole_pattern_on_the_other_part
// (2026-11-18): Jeff bound the gas-spring mount's ten holes of
// gas_spring_mount_fastener_clocking (event 0086) and not the tan link mount's.
// That side's body leads with one line, the whole pattern; hovering it washes
// the set; an armed click on one of its holes offers the set in the head bar;
// Take writes one event holding every face. Writes go to the pane's mock.
async function testOppositePattern(browser, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const V2 = "vpa_end_stop_v2";
  const TAN = "9913d0cff39c81393aad6ff5f1c6e16a472167289ce06398cea84e1709065d6c";
  const FID = "tan_link_mount_215175_002@gas_spring_mount_fastener_clocking";
  const LINE = "10 of 10 holes Ø5, coaxial within 0.000 mm";
  const servedLog = await readProjection("feature-identity/log.json");
  const v2 = topologies && (topologies.topologies || []).find((t) => t.id === V2);
  const events = (servedLog && servedLog.events) || [];
  const boundAt = (part, node) => events.filter((e) => e.feature_key && e.feature_key.part === part &&
    e.feature_key.node === node).pop();
  const mount = boundAt("gas_spring_mount_213668_002", "gas_spring_mount_fastener_clocking");
  const mine = boundAt("tan_link_mount_215175_002", "gas_spring_mount_fastener_clocking");
  if (!v2 || !mount || mount.verdict !== "bound" || mine || !existsSync(join(DATA_REPO, "data", "meshes", TAN, "manifest.json"))) {
    push("[real] a bound pattern offers the whole pattern on the other part (skipped: model v2, the tan link " +
      "mount's mesh, or the gas-spring mount's side bound and the tan link mount's not in the served log -- " +
      "build them, or pass --repo <main checkout>)", true);
    return reportSuite(label, checks, errors);
  }
  const index = await realDataIndexForTheAnnotator();
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await installRealAnnotatorReads(page, { meshes: index.meshes, runs: index.runs, aliases: index.aliases,
    binding: "real" });
  const inPane = (fn, arg) => page.evaluate(({ src, arg }) => {
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    if (!w || !w.document) return null;
    return new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
  }, { src: fn.toString(), arg });
  const until = async (fn, arg, timeout = 60000) => {
    try {
      await page.waitForFunction(({ src, arg }) => {
        const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
        if (!w || !w.document) return false;
        return !!new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
      }, { src: fn.toString(), arg }, { timeout, polling: 100 });
      return true;
    } catch {
      return false;
    }
  };
  const row = `#navtree [data-nav-kind="feature"][data-nav-id="${FID}"]`;
  const slot = () => page.locator(row).locator("xpath=..").locator(".navtree__scene").first();
  const patternLine = () => slot().locator(".navtree__featurestate", { hasText: LINE }).first();
  const writes = () => inPane((w) => (w.__mockWrites || []).length);
  const writtenSince = (n) => inPane((w, n) => (w.__mockWrites || []).slice(n).map((x) => ({
    verdict: x.event.verdict, part: x.event.feature_key && x.event.feature_key.part,
    faces: (x.event.geometry_keys || [x.event.geometry_key]).map((k) => k && k.face_id) })), n);
  try {
    await page.goto(url + "/apps/viewer/topology.html?topology=" + V2, { waitUntil: "load" });
    await page.waitForSelector("#pane-handle:visible", { timeout: 30000 }).catch(() => {});
    await page.locator("#pane-handle").click({ timeout: 10000 }).catch(() => {});
    await until((w) => !!w.__embedTree, null, 120000);
    if (!(await page.locator(row).count())) {
      await page.locator('#navtree [data-nav-twisty="p:tan_link_mount_215175_002"]').first().click({ timeout: 5000 }).catch(() => {});
    }
    const twisty = page.locator(`#navtree [data-nav-twisty="f:${FID}"]`).first();
    if (await twisty.count() && (await twisty.getAttribute("aria-expanded")) !== "true") {
      await twisty.click({ timeout: 5000 }).catch(() => {});
    }
    await patternLine().waitFor({ timeout: 180000 }).catch(() => {});
    const body = await slot().locator(".navtree__featurestate").evaluateAll((rows) => rows.map((r) => ({
      words: (r.querySelector(".navtree__featurewords") || {}).textContent || "",
      sub: (r.querySelector(".navtree__featuresub") || {}).textContent || "" }))).catch(() => []);
    console.log(`    the tan link mount's body: ${JSON.stringify(body.slice(0, 3))}`);
    push("[real] with the gas-spring mount's ten holes bound, the tan link mount's body leads with the whole " +
      "pattern: \"10 of 10 holes Ø5, coaxial within 0.000 mm\", the other sizes named",
      body.length >= 3 && body[1].words === LINE &&
      /^the whole pattern bound on .* · Ø6\.69, Ø6\.3, Ø5\.8, Ø3\.31 on the same axes, each its own row$/.test(body[1].sub));

    // The head offer: an armed click on one of the pattern's holes.
    await slot().locator('button[data-body-act="arm"]').first().click({ timeout: 10000 }).catch(() => {});
    await until((w) => w.__embedTree && w.__embedTree.armed && w.__scene.pickFilter(), null, 60000);
    await until((w, s) => !!w.__scene.faceRecord(s, 72), TAN, 60000);
    let before = await writes();
    await inPane((w, s) => { w.__scene.onPick({ sha256: s, faceId: 1351 }, null, null, { shift: false }); return true; }, TAN);
    await until((w) => !!w.document.querySelector("#an-offer.an__offer--on"), null, 120000);
    const offer = await inPane((w) => {
      const n = w.document.querySelector("#an-offer.an__offer--on");
      return n ? { line: n.querySelector(".an__offer-line").textContent,
        buttons: Array.from(n.querySelectorAll("button")).map((b) => b.textContent),
        lit: w.__groupOffer ? w.__groupOffer.faces.length : null } : null;
    });
    console.log(`    an armed click on face 1351: ${JSON.stringify(offer)}`);
    push("[real] an armed click on one of those holes offers the same set in the head bar, all twenty faces lit, " +
      "writing nothing",
      !!offer && offer.line === LINE && offer.buttons[0] === "Take all 10 holes" && offer.lit === 20 &&
      (await writes()) === before);
    await page.keyboard.press("Escape");
    await until((w) => !w.__embedTree.armed && !w.document.querySelector("#an-offer.an__offer--on"), null, 15000);

    // Hover lights the set.
    await patternLine().waitFor({ timeout: 60000 }).catch(() => {});
    await patternLine().hover({ timeout: 10000 }).catch(() => {});
    await until((w) => w.__lastWash && (w.__lastWash.faceIds || []).length === 20, null, 15000);
    const wash = await inPane((w) => w.__lastWash && { sha256: w.__lastWash.sha256, faceIds: w.__lastWash.faceIds,
      overlays: w.__lastWash.overlays });
    console.log(`    hovering the line washes ${JSON.stringify(wash && { n: wash.faceIds.length, overlays: wash.overlays })}`);
    push("[real] hovering the line washes all twenty faces of the set in the pane",
      !!wash && wash.sha256 === TAN && wash.faceIds.length === 20 && wash.overlays >= 40);
    await page.mouse.move(5, 5);

    // Take writes the set, one event.
    before = await writes();
    // A listed line carries its Take on itself (renderBodyPlan).
    await patternLine().locator("button", { hasText: "Take" }).first().click({ timeout: 10000 }).catch(() => {});
    await until((w, n) => (w.__mockWrites || []).length > n, before, 60000);
    await page.waitForTimeout(500);
    const took = await writtenSince(before);
    console.log(`    Take wrote ${JSON.stringify(took)}`);
    push("[real] Take writes one bound event on the tan link mount holding all twenty faces",
      took.length === 1 && took[0].verdict === "bound" && took[0].part === "tan_link_mount_215175_002" &&
      took[0].faces.length === 20 && took[0].faces.indexOf(1351) !== -1);
  } catch (err) {
    errors.push(String(err));
  } finally {
    await page.close();
    server.close();
  }
  return reportSuite(label, checks, errors);
}

function startDrawingCheckerMountServer() {
  const mounts = [
    ["/tolstack/viewer/", join(REPO, "apps", "viewer")],
    ["/tolstack/annotate/", join(REPO, "apps", "annotate")],
    ["/tolstack/data/meshes/", join(DATA_REPO, "data", "meshes")],
    ["/tolstack/data/", join(DATA_REPO, "data", "projections", "viewer")],
  ];
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        const mount = mounts.find(([prefix]) => urlPath.startsWith(prefix));
        if (!mount) throw new Error("no mount");
        const root = mount[1];
        const full = join(root, normalize(urlPath.slice(mount[0].length)));
        if (!full.startsWith(root + sep)) throw new Error("outside the mount");
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

async function testScenePaneOverHttp(browser, label) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const kinematic = await readProjection("kinematic/kinematic_studies.json");
  const readSet = await readProjection("kinematic/annotate.json");
  const study = kinematic && (kinematic.studies || []).find((s) => s.id === SWEEP_RAIL_STUDY);
  if (!study || !readSet) {
    push("[real] SKIPPED: the pane over HTTP -- the kinematic projection or the " +
      "annotator's read set (kinematic/annotate.json) is not built under the " +
      "target repo (rebuild, or pass --repo)", true);
    return reportSuite(label, checks, errors);
  }
  const server = await startDrawingCheckerMountServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 2400, height: 1000 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  const inPane = (fn, arg) => page.evaluate(({ src, arg }) => {
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    if (!w || !w.document) return null;
    return new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
  }, { src: fn.toString(), arg });
  const until = async (fn, arg, timeout = 60000) => {
    try {
      await page.waitForFunction(({ src, arg }) => {
        const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
        if (!w || !w.document) return false;
        return !!new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
      }, { src: fn.toString(), arg }, { timeout, polling: 100 });
      return true;
    } catch {
      return false;
    }
  };
  // The pane's own document, measured: does it scroll?
  const scrollOf = () => inPane((w) => {
    const d = w.document.scrollingElement;
    const an = w.document.querySelector(".an").getBoundingClientRect();
    return { scroll: d.scrollHeight, client: d.clientHeight,
      width: Math.round(w.innerWidth), gap: Math.round(w.innerHeight - an.bottom) };
  });
  const atWidth = async (px) => {
    await page.evaluate((px) => {
      document.querySelector("#annotate-flyout").style.width = px + "px";
    }, px);
    await page.waitForTimeout(400);
    return scrollOf();
  };
  try {
    await page.goto(url + "/tolstack/viewer/topology.html?kinematic=" + SWEEP_RAIL_STUDY,
      { waitUntil: "load" });
    await page.waitForSelector("div.kmverdict", { timeout: 30000 });
    await page.waitForSelector("#pane-handle:visible", { timeout: 15000 }).catch(() => {});
    push("[real] served the way drawing-checker serves it, the seam shows the one 3D handle " +
      "and the head shows none",
      await page.locator("#pane-handle").isVisible() &&
      await page.locator(".topbar button", { hasText: /^3D$/ }).count() === 0);
    await page.locator("#pane-handle").click({ timeout: 5000 }).catch(() => {});
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 5000 }).catch(() => {});
    push("[real] the handle opens the pane and hides itself while it is open; the pane's " +
      "own head carries no Close button -- the divider's chevron is the way back",
      await page.locator("#annotate-flyout").evaluate((n) => n.open) &&
      !(await page.locator("#pane-handle").isVisible()) &&
      await page.locator("#annotate-flyout .flyout__head button").count() === 0 &&
      await page.locator("#flyout-divider #flyout-collapse").count() === 1);

    // --- the mechanism, read with no grant ----------------------------------
    const runId = study.sweep.run_id;
    const swept = await until((w, r) => w.__sweep && w.__sweep.artifact &&
      w.__sweep.artifact.runId === r && w.__sweep.bodies && w.__sweep.bodies.length > 0 &&
      // Every part the sweep placed is in the scene, its mesh read over HTTP.
      // Not `openedBySweep`: since 4c0b7c62 the page's `isolate parts` scope
      // usually loads them first, and a part already open is not one the
      // sweep opened (installRealAnnotatorReads's synthetic binding says more).
      w.__sweep.anchored && w.__sweep.anchored.length > 0 &&
      w.__sweep.anchored.every((sha) => w.__scene && w.__scene.parts.has(sha)), runId, 180000);
    const served = await inPane((w) => w.document.body.classList.contains("an--served"));
    push("[real] with no folder grant, the pane reads the run and the meshes over HTTP " +
      "and shows the mechanism -- on the HTTP transport, not the mock and not a folder",
      swept && served);
    const start = await inPane((w) => w.__sweep.playbackPosition);
    await inPane((w) => w.AnnotateApp.exec(["play"]));
    const played = await until((w, s) => w.__sweep.playbackPosition !== s, start, 15000);
    push("[real] ...and the sweep plays", played);
    await inPane((w) => w.AnnotateApp.exec(["pause"]));

    // --- the status dot, in the pane's header -------------------------------
    //
    // None while the reader only watches the sweep (the_demo_path_reads_
    // cleanly_on_a_projector): an amber word through a whole demo reads as a
    // fault. It appears once a write begins -- here, a face picked to bind --
    // and is then the word that asks for the folder.
    const chipWhileWatching = await page.evaluate(() => {
      const node = document.querySelector("#flyout-status");
      return !!node && node.style.display !== "none" && node.textContent.trim() !== "";
    });
    push("[real] while the reader only watches the sweep, the pane's header wears " +
      "no status chip", !chipWhileWatching);
    await inPane((w) => w.AnnotateApp.exec(["select-face", w.__sweep.anchored[0], "0"]));
    const status = await page.waitForFunction(() => {
      const node = document.querySelector("#flyout-status");
      const word = node && node.style.display !== "none" ? node.textContent.trim() : "";
      return word ? { word, tone: node.getAttribute("data-tone"),
        sentence: node.getAttribute("title") || "" } : null;
    }, null, { timeout: 15000 }).then((h) => h.jsonValue()).catch(() => null);
    const hasFsa = await inPane((w) => typeof w.showDirectoryPicker === "function");
    const expected = await inPane((w, fsa) => {
      const S = w.AnnotateApp.PANE_STATUS;
      return fsa ? S.folderNeeded : S.readOnly;
    }, hasFsa);
    push("[real] the pane's header shows the status dot and one word -- the folder is " +
      "asked for at the first bind, never at boot",
      !!status && !!expected && status.word === expected.word &&
      status.tone === expected.tone && status.sentence === expected.sentence);
    await inPane((w) => w.AnnotateApp.exec(["deselect"]));
    push("[real] the pane itself shows no banner and no Connect button, and the head " +
      "has no link out to a page of its own",
      await inPane((w) => {
        const shown = (sel) => { const n = w.document.querySelector(sel); return !!n && n.offsetParent !== null; };
        return !shown("#banner") && !shown("#connect-btn");
      }) &&
      await page.locator("#annotate-flyout .flyout__head a").count() === 0);

    // --- the pane's document never scrolls ---------------------------------
    const narrow = await atWidth(400);
    const wide = await atWidth(1200);
    console.log(`      [${label}] pane document at ${narrow.width}px: scrollHeight ` +
      `${narrow.scroll} / clientHeight ${narrow.client}, ${narrow.gap}px under the scene; ` +
      `at ${wide.width}px: ${wide.scroll} / ${wide.client}, ${wide.gap}px under it`);
    // Fills AND does not scroll: the scene reaching the frame's bottom edge is
    // what stops a fixed height from either overflowing or leaving a strip.
    push("[real] the pane's document fills the frame and does not scroll, at a 400px " +
      "pane or at a 1200px one",
      narrow.width <= 400 && narrow.scroll === narrow.client && narrow.gap === 0 &&
      wide.width >= 1150 && wide.scroll === wide.client && wide.gap === 0);
    await atWidth(560);

    // --- the sweep bar folds to its summary line ----------------------------
    const bar = () => inPane((w) => {
      const d = w.document;
      const gate = d.querySelector(".an__sweep-gate");
      return { controls: !!d.querySelector(".an__sweep-controls"),
        readouts: !!d.querySelector(".an__sweep-readouts"),
        figures: d.querySelector(".an__sweep-figures")
          ? d.querySelector(".an__sweep-figures").textContent : null,
        gate: !!gate };
    });
    await inPane((w) => w.AnnotateApp.exec(["seek", "#0"]));
    await inPane((w) => w.document.querySelector(".an__sweep-twisty").click());
    const folded = await bar();
    await inPane((w) => w.document.querySelector(".an__sweep-twisty").click());
    const unfolded = await bar();
    push("[real] one twisty folds the sweep bar to its summary line -- the controls and " +
      "the readouts go, the frame's two figures come, the gate line stays -- and brings them back",
      !folded.controls && !folded.readouts && folded.gate &&
      typeof folded.figures === "string" && folded.figures.length > 0 &&
      unfolded.controls && unfolded.readouts && unfolded.figures === null);

    // --- the chevron closes, the handle comes back --------------------------
    await page.locator("#flyout-collapse").click({ timeout: 5000 }).catch(() => {});
    await page.waitForFunction(() => !document.body.classList.contains("flyout-open"),
      null, { timeout: 5000 }).catch(() => {});
    push("[real] the divider's chevron closes the pane and the seam's handle returns",
      !(await page.locator("#annotate-flyout").evaluate((n) => n.open)) &&
      await page.locator("#pane-handle").isVisible());

    const keys = await page.evaluate(() => [window.ViewerApp.FLYOUT_WIDTH_KEY,
      window.ViewerApp.FLYOUT_OPEN_KEY]);
    await page.evaluate((ks) => ks.forEach((k) => window.localStorage.removeItem(k)), keys);
    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.closeAllConnections();
    server.close();
  }
}

async function testAnnotateHostedPosture(browser, label, topologies) {
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
  // Everything below until the read-only half is an origin that PUBLISHES
  // NOTHING: the annotator reads over HTTP wherever the projections are
  // served, so the hosted notice and the folder-grant page are what an
  // unpublished origin gets.
  const server = await startRepoRootServer({ data: false });
  const { port } = server.address();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    // --- hosted: a visitor with no tolstack repo to grant -------------------
    await page.goto(`http://${HOSTED_TEST_HOST}:${port}/apps/annotate/index.html?embedded=1`,
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
    push("no element list or parts panel either",
      !(await rendered(page, "#element-list")) &&
      !(await rendered(page, "#parts-panel")));
    push("there is no 3D pane standing empty where the hint pointed",
      !(await rendered(page, "#canvas-host")) &&
      await page.locator("canvas").count() === 0);
    // --- local: the same URL from the machine holding the repo --------------
    // On an origin that publishes nothing the folder grant is the only way in
    // (no file:// story); where the projections ARE served, see the
    // read-only half below.
    await page.goto(`http://127.0.0.1:${port}/apps/annotate/index.html?embedded=1`,
      { waitUntil: "load" });
    const localBanner = await page.waitForFunction(() => {
      const text = document.querySelector("#notice-text")?.textContent.trim() || "";
      return text.length > 0 ? text : null;
    }, null, { timeout: 15000 }).then((h) => h.jsonValue());
    // WHICH of the two pre-connect states this is, asserted rather than
    // accepted. This read `/Connect folder|File System Access/` until
    // 2026-09-22 and was satisfied by EITHER -- the has-FSA banner, which
    // asks for the folder, or the no-FSA one, which says this browser cannot
    // have it. So it could not tell the ordinary pre-grant page from the
    // dead-end state
    // BRIEF_20260915_origin_posture_and_absent_feature_rule is deciding
    // about, and the sub-checks below it would have gone on passing if the
    // test browser lost FSA -- that brief's own "One thing to fix regardless
    // of the policy call", staged as deliverable 2 of
    // HANDOFF_20260921_policy_free_brief_residues.
    //
    // The capability is read ONCE, off the page being asserted, with the same
    // predicate apps/annotate/storage/fsa.js's FsaAdapter.isSupported() uses
    // -- not sniffed twice and not inferred from the copy, which is the thing
    // under test.
    //
    // NOTHING HERE DECIDES WHAT THE NO-FSA SURFACE SHOULD SAY. That is the
    // brief's open question (withhold the workspace, substitute ?mock=1, or
    // state the limit and show nothing -- it currently does the third for
    // this reader and the first for a hosted one, which is two answers to one
    // question). So the no-FSA arm is an explicit named skip pointing back at
    // it, and an honest gap beats a disjunction that hides one.
    const localHasFsa = await page.evaluate(
      () => typeof window.showDirectoryPicker === "function");
    if (localHasFsa) {
      push("a loopback page in a browser WITH File System Access asks for the " +
        "folder, and says nothing about the API",
        /Connect folder/.test(localBanner) &&
        !/File System Access/.test(localBanner));
    } else {
      push("SKIPPED: a loopback page in a browser WITHOUT File System Access " +
        "-- what that reader should be shown is " +
        "BRIEF_20260915_origin_posture_and_absent_feature_rule's open " +
        "question, so this tier asserts no copy for it", true);
    }
    push("and it does NOT show the hosted notice",
      !/not available on this site/.test(localBanner));
    // The discriminating half of the withholding above: on the origin that CAN
    // annotate, the whole workspace is there and the console is live, before a
    // folder has even been granted. Without this, "hide everything, always"
    // would pass every one of the hosted checks.
    //
    // Gated on the same capability read, and this is the half the brief called
    // out: on a no-FSA browser "the full workspace renders" is the DEFECT it
    // measured (a pane telling the reader to click a face in a 3D view, under
    // a sentence saying annotation is unavailable), so asserting it
    // unconditionally is a guard pinning a defect in place. With FSA it is the
    // correct claim -- a grant is one click away -- and that is the arm that
    // runs.
    if (localHasFsa) {
      push("the same page on loopback still has the full bind workspace",
        await rendered(page, "#detail") &&
        await rendered(page, "#element-list") &&
        await rendered(page, "#parts-panel") &&
        await rendered(page, "#canvas-host"));
      push("and the 3D view the bind instruction names really is there",
        await page.locator("#canvas-host canvas").count() === 1);
    } else {
      push("SKIPPED: what a no-FSA loopback page should SHOW under that " +
        "sentence -- withhold the workspace, substitute ?mock=1, or leave it " +
        "-- is BRIEF_20260915_origin_posture_and_absent_feature_rule's call, " +
        "and the live dev console on it is the same question", true);
    }

    // --- hosted, and the origin publishes the projections: read-only --------
    //
    // (handoff the_scene_pane_is_one_flyout_that_reads_over_http.) Until then
    // a non-loopback origin withheld the whole workspace, because the folder
    // grant was the only thing that could read. It reads over HTTP now, so a
    // hosted reader sees the scene; what they still cannot do is WRITE, and a
    // bind says so in one line when pressed -- never as standing copy, and
    // never with a folder picker they could not satisfy.
    if (!topologies) {
      push("[real] SKIPPED: the hosted read-only scene -- no data/projections/" +
        "viewer/topologies.json under the target repo (pass --repo)", true);
    } else {
      const served = await startRepoRootServer();
      try {
        const servedPort = served.address().port;
        await page.goto(`http://${HOSTED_TEST_HOST}:${servedPort}/apps/annotate/index.html?embedded=1`,
          { waitUntil: "load" });
        const loaded = await page.waitForFunction(() =>
          document.querySelectorAll("#element-list li").length > 0 &&
          document.querySelectorAll("#parts-panel li").length > 0,
        null, { timeout: 20000 }).then(() => true).catch(() => false);
        push("[real] hosted, a served origin's projections load with no grant, and the " +
          "scene is there: list, parts and the 3D view",
          loaded &&
          await rendered(page, "#element-list") &&
          await rendered(page, "#parts-panel") &&
          await rendered(page, "#canvas-host") &&
          await page.locator("#canvas-host canvas").count() === 1);
        push("[real] ...with no folder control anywhere",
          await page.locator("#connect-btn").evaluate((n) => n.style.display) === "none" &&
          !/Connect folder|connected folder/.test(
            await page.evaluate(() => document.body.innerText)));
        // A bind, pressed: the owner-not-in-set record is the one bind control
        // that needs no face picked, so it is the one this tier can press.
        const pressed = await page.evaluate(async () => {
          const rows = Array.from(document.querySelectorAll("#element-list li"));
          const row = rows.find((r) => typeof r.onclick === "function");
          if (!row) return null;
          row.click();
          await new Promise((r) => setTimeout(r, 200));
          const button = document.querySelector(".owner-not-in-set-form button");
          if (!button) return null;
          button.click();
          await new Promise((r) => setTimeout(r, 300));
          const notice = document.querySelector("#notice-text");
          return { text: notice.textContent.trim(), title: notice.title };
        });
        // Since c21a06bb (a failed write says its class in fixed words) the
        // banner is the read-only class's fixed line and the storage layer's
        // own sentence, AA.READ_ONLY_WRITE, rides on hover.
        const expected = await page.evaluate(() => {
          const AA = window.AnnotateApp;
          return { text: AA.bindFailureWords(new Error(AA.READ_ONLY_WRITE), "Record"),
            title: AA.READ_ONLY_WRITE };
        });
        push("[real] pressing a bind control says, in one line, that binding is not available here",
          pressed !== null && pressed.text === expected.text && pressed.title === expected.title);
      } finally {
        served.closeAllConnections();
        served.close();
      }
    }

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
    await pickModel(page, target.topology);
    const row = `tr.tvrow[data-id="${target.edge}"]`;
    await page.waitForSelector(row, { timeout: 10000 });
    await clearPoint(page, `${row} td.tvcell--name`, "click");

    // 1. the affordance is really on the page, on the real crop.
    const paneLauncher = page.locator("#detail button.cropfig__launch");
    await paneLauncher.waitFor({ timeout: 20000 });
    push("the preview pane's crop carries the launch affordance", true);

    // 2. and it is a KEYBOARD affordance, not a hover-only one: focusable,
    // visible once focused (opacity: 0 leaves a button in the tab order, so
    // the focus rule is what stops it being an invisible control), and Enter
    // opens it.
    // The detail pane can re-render after the first launcher appears and take
    // the focus with it, so focus is asked for again until it holds, under a
    // deadline of seconds.
    await page.waitForFunction(() => {
      const button = document.querySelector("#detail button.cropfig__launch");
      if (!button) return false;
      if (document.activeElement !== button) button.focus();
      return document.activeElement === button && Number(getComputedStyle(button).opacity) > 0.9;
    }, null, { timeout: 20000, polling: 100 }).catch(() => {});
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
      overflow: document.body.classList.contains("lightbox-open") ? "hidden" : "unlocked",
    }));
    push("Escape closes it and the page's scroll comes back",
      !afterClose.open && afterClose.overflow !== "hidden");

    // 8. the GRID's route. The grid shows no crop since the_grid_fits_the_
    // screen_and_its_brackets_say_what_nests_in_what: clicking a row keeps
    // its Preview, and the Preview's figure is where the launcher lives. The
    // click is what lets the pointer travel to it: a hover alone hands the
    // Preview back the moment the pointer leaves the row.
    push("the grid's row carries no crop and no launcher of its own",
      await page.locator(`${row} button.cropfig__launch`).count() === 0 &&
      await page.locator(`${row} img`).count() === 0);
    await page.keyboard.press("Escape");
    await page.locator(`${row} td.tvcell--name`).click();
    const cardLauncher = page.locator(
      ".detail__preview[data-preview-state='frozen'] .detail__previewbody button.cropfig__launch").first();
    await cardLauncher.waitFor({ timeout: 10000 });
    await cardLauncher.click();
    await page.waitForSelector("#crop-lightbox[open]", { timeout: 10000 });
    await page.waitForFunction(() => {
      const box = document.querySelector("#crop-lightbox div.crophl");
      return box && box.getBoundingClientRect().width > 0;
    }, null, { timeout: 10000 });
    const fromCard = await measure();
    push("the Preview's launcher opens the same lightbox, on the same rect " +
      "— so a grid row's crop reaches full size in two clicks",
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
      overflow: document.body.classList.contains("lightbox-open") ? "hidden" : "unlocked",
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
    await page.waitForSelector(MODEL_PICKER, { timeout: 20000 });
    if (await page.locator(`option${navRow("stack", STACK)}`).count() === 0) {
      console.log(`[${label}] SKIP: the live nav offers no ${STACK} leaf`);
      return { label, ok: true };
    }
    await pickStack(page, STACK);
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
    // A check's guidance is one fold deep since 2026-09-22
    // (stack_page_check_card_balance_sheet), and a paragraph inside a
    // `display: none` row measures 0px wide -- so the fold this measurement
    // reads is opened first, by the affordance a reader would use.
    await page.locator("#stackview tr.rs-row").first().click();
    await page.waitForSelector("#stackview tr.rs-fold--open", { timeout: 10000 });
    const prose = await page.evaluate(() => {
      // `.check__guidance` and not the worksheet's `<p>`: there are sixteen of
      // them on this stack, so the measurement is not about one paragraph's
      // own content. The OPEN fold's, specifically -- a closed one is 0px and
      // would satisfy "narrower than its box" for the wrong reason.
      const el = document.querySelector("#stackview tr.rs-fold--open .check__guidance");
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
    // ...and the fold goes back down, so nothing measured after this is
    // measured against a page one row taller than the one before it.
    await page.locator("#stackview tr.rs-row").first().click();

    // 3b. THE NUMBER IS UNDER THE HEADER THAT NAMES IT — the check the
    // handoff asked the browser tier for, and the one no fixture assertion
    // can make: a cell's column is a LAYOUT fact. `table-layout: fixed` plus
    // a shared <colgroup> is the mechanism (views/stack.js's RESULT_COLUMNS),
    // and this compares the rendered left edge of a data cell against the
    // rendered left edge of its header, to the pixel, for every column of
    // every row. The study grid's totals footer is guarded the same way.
    //
    // The VALUES are checked against the projection at the same time: a table
    // whose columns line up perfectly and prints `worst_case_max` under
    // `worst case min` would pass a geometry check on its own.
    const columns = await page.evaluate(async () => {
      const table = document.querySelector("#stackview table.restable");
      if (!table) return { error: "no results table" };
      const headers = [...table.querySelectorAll("thead th")]
        .map((th) => ({ label: th.textContent, x: th.getBoundingClientRect().x }));
      const rows = [...table.querySelectorAll("tbody tr.rs-row")];
      let offGrid = 0, checked = 0;
      for (const row of rows) {
        const cells = [...row.querySelectorAll("td")];
        if (cells.length !== headers.length) { offGrid += 1; continue; }
        cells.forEach((td, i) => {
          checked += 1;
          if (Math.abs(td.getBoundingClientRect().x - headers[i].x) > 0.5) {
            offGrid += 1;
          }
        });
      }
      // ...and the numbers themselves, off the projection the page read.
      const proj = await (await fetch("/data/projections/viewer/results.json")).json();
      const stack = proj.stacks.filter((s) => s.id === "hub_bearing_thermal_fit_m1")[0];
      const column = (label) =>
        headers.findIndex((h) => h.label.indexOf(label) === 0);
      const readAt = (row, label) => {
        const cell = row.querySelectorAll("td")[column(label)];
        return cell ? cell.textContent.trim() : null;
      };
      const wrong = [];
      // Each precondition the value loop stands on is a REASON, not a throw:
      // fewer rows than checks, a renamed header and a stack gone from the
      // projection are the regressions this check exists for, and a throw
      // here would take the suite down as an unnamed ERROR instead of
      // reddening the push below by name.
      if (!stack) wrong.push("hub_bearing_thermal_fit_m1 is not in results.json");
      (stack ? stack.checks : []).forEach((check, i) => {
        [["nominal", check.nominal],
         ["worst case min", check.worst_case_min],
         ["worst case max", check.worst_case_max],
         ["RSS center", check.rss_center],
         ["RSS half", check.rss_half]].forEach((pair) => {
          if (!rows[i]) {
            wrong.push(`${check.check_id}: no row on the page`);
            return;
          }
          if (column(pair[0]) < 0) {
            wrong.push(`${check.check_id} ${pair[0]}: no header names it`);
            return;
          }
          const printed = readAt(rows[i], pair[0]);
          if (printed !== String(pair[1])) {
            wrong.push(`${check.check_id} ${pair[0]}: ${printed} != ${pair[1]}`);
          }
        });
      });
      return {
        headers: headers.length, rows: rows.length, checked, offGrid,
        wrong: wrong.slice(0, 4), wrongCount: wrong.length,
      };
    });
    if (columns.offGrid || columns.wrongCount) {
      console.log(`    ${columns.offGrid} of ${columns.checked} cells off ` +
        `their header's left edge; ${columns.wrongCount} values in the wrong ` +
        `column: ${(columns.wrong || []).join("; ")}`);
    }
    push("every cell of the results table starts at its own header's left " +
      "edge, and each of a check's five numbers is printed verbatim under " +
      "the header that names it — a scannable table that puts a value one " +
      "column over is worse than the cards it replaced",
      columns.rows === 16 && columns.headers === 9 && columns.checked === 144 &&
      columns.offGrid === 0 && columns.wrongCount === 0);

    // 3c. A ROW IS A ROW. The page was 10,633px tall on this stack because
    // each of its sixteen check cards was as tall as its own guidance
    // paragraph; the point of the fold is that a row's height is now a
    // property of the table and not of the prose behind it.
    const resultRows = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("#stackview tr.rs-row")];
      const heights = rows.map((r) => r.getBoundingClientRect().height);
      return {
        n: rows.length,
        tallest: Math.max(...heights),
        openFolds: document.querySelectorAll("#stackview tr.rs-fold--open").length,
        pane: document.querySelector("#stackview").scrollHeight,
      };
    });
    if (!(resultRows.tallest <= 90 && resultRows.openFolds === 0)) {
      console.log(`    tallest of ${resultRows.n} rows is ` +
        `${Math.round(resultRows.tallest)}px, ${resultRows.openFolds} folds ` +
        `open, pane ${resultRows.pane}px`);
    }
    // 130px is the name cell at its worst in a 702px scrollport: a clamped
    // one-line label over four corner chips that wrap to three lines. It is a
    // bound on the TABLE's own geometry -- the number that matters is that it
    // is not a function of the guidance behind the row, and the cards this
    // replaced ran to ~500px each for exactly that reason.
    push("no result row is taller than a name and its corner chips, and every " +
      "record starts folded — the 10,633px page this replaced was sixteen " +
      "cards as tall as the prose inside them",
      resultRows.n === 16 && resultRows.openFolds === 0 &&
      resultRows.tallest <= 130);

    // 4. THE NAME COLUMN'S FLOOR. Eleven columns in an auto-layout table, so
    // the browser shares the width out by content and the one column that is a
    // PHRASE rather than a number loses: the name wrapped to four lines and
    // stood the row up 90px tall. The floor is read off the computed style
    // rather than written here -- the number belongs to the stylesheet -- so
    // what is asserted is that there IS one and that the squeezed table is
    // honouring it.
    // Read at 1100px: since the fixed shell (2026-11-14) the stack page has
    // the whole middle beside the tree, which at 1600px is more room than the
    // table needs -- 1100px leaves it the ~770px the Preview beside it used
    // to.
    await page.setViewportSize({ width: 1100, height: 1000 });
    await page.waitForTimeout(300);
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
      "reason this check reads it at 1100px, where the table has the room the " +
      "1600px page left it before the stack page took the whole middle", squeezed);
    if (nameCol && !(nameCol.floor > 0 && nameCol.width >= nameCol.floor - 0.5)) {
      console.log(`    name column is ${Math.round(nameCol.width)}px against a ` +
        `declared floor of ${nameCol.floor}px (longest name ${nameCol.widest} chars)`);
    }
    push("...and the element-name column has a declared floor that the " +
      "squeeze honours — it is the one column holding a phrase rather than a " +
      "number, and with no floor auto layout gives the width to the numbers " +
      "and wraps the name to four lines",
      nameCol && nameCol.floor > 0 && nameCol.width >= nameCol.floor - 0.5);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.waitForTimeout(300);

    // 5. A DATA ROW IS A ROW, NOT A BLOCK — the outcome, measured, where
    // this suite used to check one MECHANISM for reaching it.
    //
    // WHAT WAS HERE, and why it went. Two sub-checks read
    // `#stackview .el-row__srcnote:not(...--open)` and asserted that a row's
    // source note holds more than the box shows and is clamped to at most
    // three lines. The claim they carried was *the note is a preview, so it
    // is not the thing setting the row's height*.
    // `reader_facing_surfaces_second_pass` (2026-09-18) retired the composite
    // source cell in both tables: the note, the callout, the values line and
    // the rest moved to the preview pane and the row keeps chips and one
    // ellipsised where-line, so `.el-row__srcnote` is rendered by nothing at
    // all and both checks read `null`. The rule was not weakened — it was
    // satisfied more completely than a clamp can satisfy it, which is exactly
    // the case where a guard on the mechanism stops meaning anything while a
    // guard on the outcome starts to.
    //
    // Neither branch could see this alone: the clamp checks were written on
    // 2026-09-18 by `visual_rules_nothing_checks` while
    // `reader_facing_surfaces_second_pass`, cut from `47134d6`, was deleting
    // the node. Each was green by itself and the merge was 7/9. Filed as
    // ISSUE_20260918_the_source_note_clamp_checks_lost_their_subject_when_the_
    // composite_source_cell_was_retired.md so the substitution is visible to
    // whoever owns the typography rules.
    //
    // WHY THE OUTCOME AND NOT A RE-POINT. The two clamped previews left are
    // `hovercard__note` and `el-export__note`; neither sits in a table row,
    // so neither carries the row-height argument, and pointing at one would
    // be a new claim wearing an old sentence. What the rule is about is how
    // TALL a data row is — and that is measurable directly, and only here:
    // the fast tier has a DOM shim and no layout at all, so its structural
    // twin (`the materials ROW keeps only what decides whether to click it`,
    // a fixture check -- the `[real]` twin beside it is `the live material
    // entries show the provenance of their CTE`) can say the pane's nodes are
    // absent from the row but cannot say the row is short.
    //
    // THE NUMBERS THIS STANDS ON, measured on this stack at this viewport:
    // before the retirement the first materials row was 653px (750px before
    // the clamp tightened on 2026-09-17) against elements rows of 88-112px
    // — between five and seven times a data row in the table directly
    // above it. After: 111-169px. The factor of two is deliberately slack:
    // the materials table's designation column holds a real specification
    // string that wraps, and the rule is about a row reading as a row, not
    // about a pixel budget.
    const rowHeights = await page.evaluate(() => {
      const heights = (sel) => [...document.querySelectorAll(sel)]
        .map((tr) => tr.getBoundingClientRect().height);
      const first = document.querySelector("#stackview tr.mat-row");
      return {
        el: heights("#stackview tr.el-row"),
        mat: heights("#stackview tr.mat-row"),
        rowText: first ? first.textContent.replace(/\s+/g, " ").trim().length : 0,
      };
    });

    // THE WITNESS, and it is the half that keeps this honest: a short row
    // could mean the detail was DELETED rather than moved. Select the row and
    // read the pane. If the pane does not carry more than the row does, the
    // rows are short for the wrong reason and this suite has to say so.
    let paneText = 0;
    if (rowHeights.mat.length) {
      await page.locator("#stackview tr.mat-row").first().click();
      await page.waitForSelector("#detail .mat__values", { timeout: 10000 })
        .catch(() => {});
      paneText = await page.evaluate(() => {
        const pane = document.querySelector("#detail");
        return pane ? pane.textContent.replace(/\s+/g, " ").trim().length : 0;
      });
    }
    if (!(rowHeights.rowText > 0 && paneText > rowHeights.rowText)) {
      console.log(`    the first materials row carries ${rowHeights.rowText} ` +
        `characters and selecting it puts ${paneText} in the pane — the row ` +
        "is not short because its detail moved");
    }
    push("selecting a materials row puts MORE of its sourcing in the preview " +
      "pane than the row itself carries — the witness, because a row that " +
      "got short by losing its argument rather than by moving it would pass " +
      "the height claim below while being the worse page",
      rowHeights.rowText > 0 && paneText > rowHeights.rowText);

    const tallestEl = Math.max(0, ...rowHeights.el);
    const tallestMat = Math.max(0, ...rowHeights.mat);
    const ratio = tallestEl ? tallestMat / tallestEl : 0;
    if (!(rowHeights.el.length && rowHeights.mat.length && ratio <= 2)) {
      console.log(`    tallest elements row ${Math.round(tallestEl)}px, ` +
        `tallest materials row ${Math.round(tallestMat)}px ` +
        `(${ratio.toFixed(1)}x) over ${rowHeights.el.length} and ` +
        `${rowHeights.mat.length} rows`);
    }
    push("...and no materials row is more than twice the tallest elements " +
      "row — the two tables sit one above the other on this page, and a " +
      "source column that stacks chips, a where-line, a values line, a note, " +
      "a citation and a request one under the next makes a row seven times " +
      "the height of the data beside it and the table read as a list of blocks",
      rowHeights.el.length > 0 && rowHeights.mat.length > 0 && ratio <= 2);

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
    await page.waitForSelector("tfoot.tvfoot", { timeout: 15000 });
    push("a topology+study link opens with the study selected",
      await page.locator("#totals h2.tvsum__title")
        .getAttribute("title") === "demo_base_to_tip" &&
      await page.locator("tfoot.tvfoot").count() === 1);
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

// --- the kinematic study page (the_viewer_shows_a_kinematic_study) ---------
//
// The DoD, in a real browser: a `?kinematic=` deep link opens the study page
// with one verdict chip per stop above the fold, the model under them with
// the study's lit set on and the rest dimmed (or hidden, by the toolbar's
// toggle); a hover on the chart reads a sweep point; one table says each
// contributor once with a column group per stop, and a coefficient's hover
// draws its curve; a row click selects its edge IN PLACE; and with the
// projection absent the nav has no section and the page raises nothing
// (the_kinematic_page_keeps_the_dag_and_says_each_contributor_once,
// 2026-10-26). The real half boots the live
// projections through a MemoryAdapter on file:// (the "real render path"
// suite's seam), then once more over a repo-root static server, so the HTTP
// transport's own read of kinematic/kinematic_studies.json is the one proved.
//
// Reading the projection here rather than in the dispatcher keeps the
// registry's argument list unchanged for every other suite.
async function testKinematicStudyPage(browser, fileBase, label, realProjection,
                                      realResults, realCrops) {
  const realKinematic = await readProjection("kinematic/kinematic_studies.json");
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const server = await startRepoRootServer();
  const servedBase = `http://127.0.0.1:${server.address().port}`;
  const STUDY = "vpa_pitch_linkage_blade_pitch_at_the_stops";
  const boot = async (search, kinematic) => {
    await page.goto(fileBase + "/topology.html" + search, { waitUntil: "load" });
    await page.evaluate(({ topologies, results, crops, kinematic }) => {
      const VA = window.ViewerApp;
      const Fake = function () {
        return new VA.MemoryAdapter({ startState: VA.STATE.READY, topologies,
          results, crops, kinematic, images: {}, texts: {} });
      };
      Fake.isSupported = () => true;
      VA.FsaAdapter = Fake;
      VA.bootTopology();
    }, { topologies: realProjection, results: realResults, crops: realCrops,
         kinematic });
  };
  try {
    // The tour first: it needs no build, so it holds on a fresh clone.
    await page.goto(fileBase +
      "/topology.html?mock=1&kinematic=demo_mechanism_tip_angle_at_the_stops",
      { waitUntil: "load" });
    await page.waitForSelector("div.kmverdict", { timeout: 15000 });
    push("the tour opens a kinematic study from its deep link, one verdict per stop",
      await page.locator("div.kmverdict").count() === 2 &&
      await page.locator(navRow("kinematic", "demo_mechanism_tip_angle_at_the_stops") +
        ".navtree__row--on").count() === 1);
    // The page every study page is (2026-10-28): the model and the grid beside
    // it in the main column -- the grid IS the study's contributor table, its
    // stack (the_kinematic_grid_is_a_stack_of_sub_stacks) -- and the results
    // -- name, verdicts, chart, readouts -- at the top of the right-hand pane,
    // over the selection's preview.
    const shape = await page.evaluate(() => {
      const box = (sel) => {
        const n = document.querySelector(sel);
        return n ? n.getBoundingClientRect() : null;
      };
      return { pane: box("#topopane"), table: box("#topogrid table.tvtable"),
        grid: box("#topogrid"),
        main: box(".tv__main"), detail: box("#detail"),
        verdicts: box("#detail div.kmverdict"), chart: box("#detail figure.kmchart"),
        readouts: box("#detail table.kmreadouts"), preview: box("#detail .detail__preview"),
        results: box("#detail .kmresults") };
    });
    push("the kinematic page draws the model in the DAG's region and its stack in the grid " +
      "beside it, and its verdicts, chart and readouts in one column at the top of the pane under the grid",
      await page.locator("#topopane svg.tv__map").isVisible() &&
      await page.locator("#detail figure.kmchart svg").isVisible() &&
      shape.table && shape.verdicts && shape.chart && shape.readouts && shape.preview &&
      shape.pane.right <= shape.main.left + 8 && shape.detail.top >= shape.grid.bottom - 8 &&
      shape.verdicts.top < shape.chart.top && shape.chart.top < shape.readouts.top &&
      // The results scroll in their own box above the Preview (a_preview_
      // pane_replaces_the_hover_popups_and_one_record_backs_every_mark), so
      // the table can run past the Preview's top inside that box: what holds
      // is the order within the results, and the results' box above it.
      shape.results && shape.results.bottom <= shape.preview.top + 1 &&
      await page.locator("#topogrid tr.tvrow--substack").count() > 0 &&
      await page.locator("table.kmtable").count() === 0 &&
      await page.locator("#kinematicview").count() === 0);
    // A term row of the stack names an edge, and pointing at it previews that
    // edge's record below the results.
    const contributor = await page.locator("#topogrid tr.tvrow--edge[data-id]").first()
      .getAttribute("data-id");
    await page.locator("#topogrid tr.tvrow--edge[data-id]").first()
      .locator("td.tvcell--name").hover();
    push("pointing at a contributor row previews its edge's record",
      await page.waitForFunction((key) => {
        const p = document.querySelector(".detail__preview");
        return p && p.getAttribute("data-preview-key") === key &&
          p.getAttribute("data-preview-state") === "hover";
      }, "edge|" + contributor, { timeout: 5000 }).then(() => true, () => false));
    await page.mouse.move(4, 4);
    await pickModel(page, "demo_mechanism");
    await page.waitForSelector("tr.tvrow", { timeout: 5000 });
    await page.locator(navRow("kinematic", "demo_mechanism_tip_angle_at_the_stops")).click();
    await page.waitForSelector("div.kmverdict", { timeout: 5000 });
    await page.waitForTimeout(600);
    push("the nav's kinematic row brings the page back after a topology",
      await page.locator("div.kmverdict").count() === 2 &&
      await page.locator("#topopane").isVisible() &&
      await page.locator("#topopane svg.tv__map").count() === 1 &&
      await page.locator("#topogrid tr.tvrow--substack").count() > 0);

    if (!realProjection || !realResults || !realKinematic) {
      push("[real] kinematic study page (skipped: the projections are not built " +
        "-- build them, or pass --repo <main checkout>)", true);
    } else {
      await boot("?kinematic=" + STUDY, realKinematic);
      await page.waitForSelector("div.kmverdict", { timeout: 15000 });
      // The real-data seam boots twice (the page's own boot, then this
      // one), so the model is read after the second paint has settled.
      await page.waitForSelector("#topopane svg.tv__map", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(600);
      const verdicts = await page.locator("div.kmverdict").allTextContents();
      push("[real] the study page reads one verdict chip per stop",
        verdicts.length === 2 &&
        // One-sided reach against S461-261 since each_stop_is_its_own_stack
        // (2026-11-03): the feather stop at least +70 (`pass`, +1.217), the
        // low stop at most -5 (`marginal`, -0.363), each with its RSS margin.
        /pass/.test(verdicts[0]) && /margin \+1\.217 deg · RSS \+1\.718/.test(verdicts[0]) &&
        /at least \+70 deg/.test(verdicts[0]) &&
        /marginal/.test(verdicts[1]) && /margin -0\.363 deg · RSS \+0\.958/.test(verdicts[1]) &&
        /at most −5 deg/.test(verdicts[1]) &&
        await page.locator("div.kmverdict span.tvverdict--marginal").count() === 1 &&
        await page.locator("div.kmverdict span.tvverdict--pass").count() === 1);

      // Each stop is its own stack (2026-11-03): a point at its nominal x
      // with a worst-case bar and a heavier RSS bar over it, its pitch beside
      // it, the reach bound's tick, nothing drawn past the sweep, and one line
      // under the chart naming the stop the sweep's zero is -- all in the
      // right-hand pane, the chart at its own drawn size there.
      const plot = await page.evaluate(() => {
        const svg = document.querySelector("#detail figure.kmchart svg");
        const detail = document.querySelector("#detail");
        const pts = (node) => (node ? node.getAttribute("points") : "").trim().split(/\s+/)
          .filter(Boolean).map((p) => p.split(",").map(Number));
        const worst = pts(document.querySelector("#detail polygon.kmchart__worst"));
        const xs = worst.map((p) => p[0]);
        const anchor = document.querySelector(
          "#topogrid tr[data-substack='vpa_pitch_linkage_hub_to_feather_stop']");
        const bar = (stop) => {
          const n = document.querySelector(
            `#detail line.kmchart__bar--worst[data-stop='${stop}']`);
          const r = document.querySelector(
            `#detail line.kmchart__bar--rss[data-stop='${stop}']`);
          if (!n || !r) return null;
          const y = (el) => [Number(el.getAttribute("y1")), Number(el.getAttribute("y2"))];
          return { x: Number(n.getAttribute("x1")), worst: y(n), rss: y(r) };
        };
        return {
          envelopeFrom: Math.min(...xs), envelopeTo: Math.max(...xs),
          bars: { minus7: bar("minus7"), plus72: bar("plus72") },
          bounds: document.querySelectorAll("#detail line.kmchart__bound").length,
          wedges: document.querySelectorAll("#detail polygon.kmchart__region").length +
            document.querySelectorAll("#detail rect.kmchart__band").length,
          anchorGap: !!(anchor && anchor.querySelector(".tvmark--no_value")),
          labels: [...document.querySelectorAll("#detail text.kmchart__barlabel")]
            .map((n) => n.textContent),
          note: (document.querySelector("#detail p.kmchart__note") || {}).textContent || "",
          readouts: [...document.querySelectorAll("#detail tr.kmreadouts__says")]
            .map((n) => n.textContent),
          range: !!document.querySelector("#detail tr.kmreadouts__range"),
          axis: [...document.querySelectorAll("#detail text.kmchart__axis")]
            .map((n) => n.textContent),
          chartWidth: svg ? Math.round(svg.getBoundingClientRect().width) : 0,
          drawnWidth: svg ? Number(svg.getAttribute("width")) : 0,
          paneWidth: Math.round(detail.getBoundingClientRect().width),
        };
      });
      console.log(`      results pane ${plot.paneWidth}px, chart ${plot.chartWidth}px ` +
        `of its ${plot.drawnWidth}px`);
      console.log(`      stop bars ${JSON.stringify(plot.bars)}`);
      const inside = (b) => b && b.x >= plot.envelopeFrom - 0.01 && b.x <= plot.envelopeTo + 0.01 &&
        b.rss[0] > b.worst[0] && b.rss[1] < b.worst[1];
      push("[real] the plot draws each stop as an error bar at its own sweep point, its " +
        "pitch beside it, and no wedge past the sweep, under one line naming the zero",
        inside(plot.bars.minus7) && inside(plot.bars.plus72) && plot.wedges === 0 &&
        plot.bounds === 2 &&
        plot.labels.join("|") === "-6.992 deg|72.001 deg" &&
        plot.note === "Zero travel is the +72 deg stop: the feather stops touching." &&
        plot.readouts.length === 3 &&
        /\(linkage at this pose\) \+ ±2\.065 \(stop position, 9 terms\)/.test(plot.readouts[0]) &&
        plot.range && /cancel to ±0\.313/.test(plot.readouts[2]) &&
        plot.anchorGap && plot.axis.indexOf("actuator travel, mm") !== -1);
      push("[real] the chart fits the results pane at its default width without " +
        "scaling its text down", plot.chartWidth >= plot.drawnWidth - 1 &&
        plot.chartWidth <= plot.paneWidth);

      // The model: the study's twenty-two lit edges on (six contributors, the
      // three edges three of them borrow a band from, the nine edges its two
      // stop chains stand on -- the feather stop's five and the travel's
      // four -- and the five joints between lit nodes; since 2026-11-03 the
      // feather chain joins the travel stack to the linkage, so no bridge
      // through the hub is lit), the other seventy-seven dimmed (seventy-six before
      // the 2026-11-03 slide re-author's edge merged in), the grid beside them
      // the stack at the -7 stop: its six linkage terms, the feather and travel
      // chains folded under their headers (seventeen edge rows before
      // the_kinematic_grid_is_a_stack_of_sub_stacks), all under verdicts that
      // are on the first screen.
      const fold = await page.evaluate(() => {
        const bottoms = [...document.querySelectorAll("div.kmverdict > *")]
          .map((n) => n.getBoundingClientRect().bottom);
        const pane = document.querySelector("#topopane").getBoundingClientRect();
        return { verdicts: Math.max(...bottoms), paneTop: pane.top,
                 viewport: window.innerHeight };
      });
      const gridRows = () => page.locator("#topogrid tr.tvrow--edge").count();
      push("[real] on the first screen, the verdicts beside the model, and the grid the " +
        "study's six contributors under its five sub-stack headers",
        fold.verdicts < fold.viewport && fold.paneTop < fold.viewport &&
        await gridRows() === 6 &&
        await page.locator("#topogrid tr.tvrow--substack").count() === 5);
      const detailBefore = await page.locator("#detail").innerHTML();
      const contribBefore = await page.locator("#detail div.kmstop").count();
      await page.locator("#unlit-style-toggle").click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
      push("[real] toggling Unused leaves the results pane's DOM identical, its " +
        "stop picker included", contribBefore === 1 &&
        await page.locator("#detail").innerHTML() === detailBefore);
      const hiddenRows = await gridRows();
      // One connected walk: the hidden walk of the very projection the page
      // was handed has one connected component, nodes and edges together.
      const hiddenPieces = await page.evaluate(({ topologies, kinematic, study }) => {
        const VA = window.ViewerApp;
        const topo = VA.findTopology(topologies, kinematic.studies.filter(
          (s) => s.id === study)[0].topology);
        const lit = VA.kinematicLitSet(VA.findKinematicStudy(kinematic, study), topo);
        const rows = VA.bandLayout(topo.layout, lit, { only: true }).rows;
        const parent = {};
        const find = (x) => {
          if (parent[x] === undefined) parent[x] = x;
          while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
          return x;
        };
        rows.forEach((row) => {
          find(row.id);
          if (row.kind !== "edge") return;
          [row.entered_at, row.left_at].forEach((n) => {
            if (n !== null && n !== undefined) parent[find(row.id)] = find(n);
          });
        });
        return new Set(rows.map((row) => find(row.id))).size;
      }, { topologies: realProjection, kinematic: realKinematic, study: STUDY });
      const hiddenLabel = await page.locator("#unlit-style-toggle").textContent().catch(() => "");
      await page.locator("#unlit-style-toggle").click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
      const restoredLabel = await page.locator("#unlit-style-toggle").textContent().catch(() => "");
      push("[real] the toolbar's Unused toggle says hidden and back, and the grid stays the " +
        "study's six contributors either way",
        hiddenLabel === "Unused: hidden" && /Unused: dimmed/.test(restoredLabel) &&
        hiddenRows === 6 && await gridRows() === 6);
      push("[real] hidden, the lit model's walk is one connected piece", hiddenPieces === 1);

      // The wiring, not the view: topology_app.js hands the kinematic view its
      // `onCardShow: showCard`. Without it citationTrigger falls back to a
      // native `title` tooltip, and every fast-tier check passes its own
      // onCardShow -- so only a real hover on the live page sees the card.
      await page.locator("span.kmverdict__limit").first().hover();
      const limitCard = await page.waitForFunction(() => {
        const pop = document.querySelector("#croppop");
        return pop && pop.style.display === "block" &&
          pop.className.indexOf("hovercard--citation") !== -1 ? pop.innerText : null;
      }, null, { timeout: 5000 }).then((h) => h.jsonValue(), () => "");
      // The card shows the note's lead sentence; the rest is behind its fold.
      push("[real] hovering a stop's limit opens its citation card, S461-261 and its note",
        /S461-261/.test(limitCard) && /Blade Pitch Control Range/.test(limitCard));
      await dismissCard(page);

      // The first sweep point is the -7 deg stop; its strip is at the chart's
      // driver minimum or maximum depending on the sweep's direction, so the
      // point is found by its own index rather than by where it is drawn.
      // A point reads the ENVELOPE there -- the six direct contributors,
      // 0.290 / 0.169 -- not the stop's own 2.355 / 1.034, which its error
      // bar carries (2026-11-03).
      await page.locator('rect.kmchart__hit[data-index="0"]').hover();
      const tip = page.locator("div.kmchart__tip");
      const tipText = (await tip.isVisible()) ? await tip.innerText() : "";
      push("[real] hovering an envelope point reads its driver, nominal and both spreads",
        /actuator travel/.test(tipText) && /64\.466 mm/.test(tipText) &&
        /-6\.992 deg/.test(tipText) && /±0\.290 deg/.test(tipText) &&
        /RSS/.test(tipText) && /±0\.169 deg/.test(tipText));

      // The grid is the study's stack at the -7 stop
      // (the_kinematic_grid_is_a_stack_of_sub_stacks): the six linkage terms
      // in chain order under their header, then the stop position's three
      // sub-stacks, a SENSITIVITY column before CONTRIBUTION, every row in
      // its body's tint, and the sourcing legend under it.
      const LINKAGE = ["pitch_arm_radius", "pitch_link_length", "pitch_plate_attach_height",
        "pitch_plate_tan_link_attach_radius", "tan_link_length", "tan_link_mount_height"];
      const stack = await page.evaluate(() => {
        const rows = [...document.querySelectorAll("#topogrid tr.tvrow")];
        const bg = (n) => getComputedStyle(n).backgroundColor;
        return {
          ids: rows.map((r) => r.getAttribute("data-id")),
          tints: rows.filter((r) => /tvrow--body-|conf--/.test(r.className)).length,
          painted: rows.filter((r) => r.classList.contains("tvrow--edge"))
            .some((r) => bg(r) !== "rgba(0, 0, 0, 0)"),
          braces: [...new Set([...document.querySelectorAll("#topogrid div.tvbrace")]
            .map((n) => n.getAttribute("data-brace")))],
          heads: [...document.querySelectorAll("#topogrid .tvhead, #topogrid th, #topogrid [class*='tvhead']")]
            .map((n) => n.textContent.trim().toLowerCase()),
          legend: (document.querySelector("#topogrid .tvlegend") || {}).textContent || "",
          travel: (document.querySelector(
            "#topogrid tr[data-substack='vpa_pitch_linkage_travel_between_end_stops']") || {})
            .textContent || "",
        };
      });
      console.log("      stack rows " + JSON.stringify(stack.ids));
      console.log("      brackets " + JSON.stringify(stack.braces));
      push("[real] the grid is the study's stack at the -7 stop: the six linkage terms in " +
        "chain order, the stop position's sub-stacks after them, each in its own bracket " +
        "and no row tinted",
        JSON.stringify(stack.ids) === JSON.stringify(["sub:linkage"].concat(LINKAGE,
          ["sub:stop_position", "sub:vpa_pitch_linkage_feather_stop_axial_position",
           "sub:vpa_pitch_linkage_travel_between_end_stops",
           "sub:vpa_pitch_linkage_hub_to_feather_stop"])) &&
        stack.tints === 0 && !stack.painted &&
        ["study", "linkage", "stop_position", "vpa_pitch_linkage_feather_stop_axial_position",
         "vpa_pitch_linkage_travel_between_end_stops", "vpa_pitch_linkage_hub_to_feather_stop"]
          .every((id) => stack.braces.indexOf(id) !== -1) &&
        /±0\.82 mm → ±1\.417 deg at the −7 deg stop/.test(stack.travel) &&
        /no document behind it/.test(stack.legend) && /no mark: read off/.test(stack.legend) &&
        await page.locator("#topogrid col.tvcol--sensitivity").count() > 0);

      // Every row's PART cell is a place to click, at 1600x1000 with the
      // Preview open (the_grid_fits_the_screen_and_its_brackets_say_what_
      // nests_in_what, definition of done; ISSUE_20261104_at_1600_wide_the_
      // product_graphs_rails_leave_the_grid_a_59px_slit). Pointed at as a
      // reader would -- the cell's own centre, no scroll -- and clicked: the
      // Preview must be that row's.
      {
        await scrollRegionsTop(page);
        const ids = await page.evaluate(() => [...document.querySelectorAll("#topogrid tr.tvrow--edge")]
          .map((r) => r.getAttribute("data-id")));
        const missed = [];
        for (const id of ids) {
          const at = await page.evaluate((id) => {
            const cell = document.querySelector(`#topogrid tr.tvrow[data-id="${id}"] td.tvcell--part`);
            cell.scrollIntoView({ block: "center", inline: "nearest" });
            const b = cell.getBoundingClientRect();
            const x = b.left + b.width / 2, y = b.top + b.height / 2;
            const hit = document.elementFromPoint(x, y);
            return { x, y, ok: !!hit && hit.closest("tr") === cell.closest("tr"),
                     preview: !!document.querySelector("#detail") };
          }, id);
          if (!at.ok) { missed.push(id + " (covered)"); continue; }
          await page.mouse.click(at.x, at.y);
          // FROZEN, not just previewed: a hover alone previews the row, and
          // the claim is that the click lands on it.
          const kept = await page.waitForFunction((id) => {
            const p = document.querySelector(".detail__preview");
            return !!p && p.getAttribute("data-preview-key") === "edge|" + id &&
              p.getAttribute("data-preview-state") === "frozen";
          }, id, { timeout: 5000 }).then(() => true).catch(() => false);
          if (!kept) missed.push(id + " (no preview)");
        }
        const scrolled = await page.evaluate(() =>
          document.querySelector("#topopane .tv__hscroll").scrollLeft);
        console.log(`      part cells: ${ids.length - missed.length}/${ids.length} clickable, ` +
          `sideways scroll ${scrolled}` + (missed.length ? " -- " + missed.join(", ") : ""));
        push("[real] at 1600x1000 with the Preview open, every grid row's part cell is " +
          "on screen, takes the click and previews its row",
          ids.length >= 6 && missed.length === 0 && scrolled === 0 &&
          await page.locator("#detail").isVisible());
        await page.keyboard.press("Escape");
      }

      // The travel folds: four children open under its header, the motion
      // ratio at the -7 stop as their sensitivity (1.728 deg/mm), and the
      // reader's fold is remembered across a repaint.
      const travelRow = '#topogrid tr[data-substack="vpa_pitch_linkage_travel_between_end_stops"]';
      const TRAVEL_EDGES = ["piston_head_upper_thickness", "piston_head_lower_thickness",
        "gas_spring_mount_flange_to_end_stop", "piston_cover_flange_to_end_stop"];
      const travelKids = () => page.locator(TRAVEL_EDGES.map((e) =>
        `#topogrid tr.tvrow[data-id="${e}"]`).join(", "));
      const closedKids = await travelKids().count() === 0 &&
        await page.locator(travelRow).getAttribute("aria-expanded") === "false";
      await page.locator(travelRow + " td.tvcell--name").click();
      await page.waitForSelector(`#topogrid tr.tvrow[data-id="${TRAVEL_EDGES[0]}"]`,
        { timeout: 5000 }).catch(() => {});
      const kidTexts = await travelKids().allInnerTexts();
      const remembered = await page.evaluate(() => {
        try { return localStorage.getItem("tolstack.viewer.subStackFolds") || ""; } catch (e) { return ""; }
      });
      await page.locator(travelRow + " td.tvcell--name").click();
      await page.waitForTimeout(300);
      push("[real] the travel is one folded sub-stack that opens onto its four terms " +
        "with the composed sensitivity, and the fold is remembered",
        closedKids && kidTexts.length === 4 &&
        kidTexts.every((t) => /1\.728/.test(t) && !/1\.249/.test(t)) &&
        /vpa_pitch_linkage_travel_between_end_stops/.test(remembered) &&
        await travelKids().count() === 0);

      // An edge's name is read from the projection by id, so a rename of the
      // edge cannot redden a check that asks for it (2026-11-06).
      const edgeName = (id) => realProjection.topologies
        .find((t) => t.id === "vpa_pitch_linkage").edges.find((e) => e.id === id).name;
      // A sensitivity's hover: its curve across P2, in the page's one popover.
      // The tangential-link mount height's coefficient changes sign between
      // the stops, so both signs are on the card's axis.
      await page.locator('#topogrid tr.tvrow[data-id="tan_link_mount_height"] ' +
        'td.tvcell--sensitivity').hover();
      const curveCard = await page.waitForFunction(() => {
        const pop = document.querySelector("#croppop");
        return pop && pop.style.display === "block" &&
          pop.className.indexOf("hovercard--curve") !== -1 &&
          pop.querySelector("path.kmcurve__line") ? pop.innerText : null;
      }, null, { timeout: 5000 }).then((h) => h.jsonValue(), () => "");
      push("[real] hovering a sensitivity shows its curve across the sweep, both signs " +
        "of the mount height's on its axis",
        curveCard.includes(edgeName("tan_link_mount_height")) && /\+0\.172/.test(curveCard) &&
        /-0\.241/.test(curveCard));
      await dismissCard(page);

      // The +72 stop: the picker shows the stack there, which has no travel.
      await page.locator('#detail button.kmstop__button[data-stop="plus72"]').click();
      await page.waitForTimeout(400);
      const highIds = await page.locator("#topogrid tr.tvrow").evaluateAll((rs) =>
        rs.map((r) => r.getAttribute("data-id")));
      push("[real] at the +72 stop the stack has no travel",
        highIds.indexOf("sub:vpa_pitch_linkage_travel_between_end_stops") === -1 &&
        highIds.indexOf("pitch_arm_radius") !== -1);
      await page.locator('#detail button.kmstop__button[data-stop="minus7"]').click();
      await page.waitForTimeout(400);

      // In place: the page stays the study, the model marks the edge, the
      // preview pane shows it. Waits for the SELECTION in the grid, which a
      // click that left the page would also produce -- so the check reads the
      // page's own head too.
      await page.locator('#topogrid tr.tvrow[data-id="pitch_plate_attach_height"] ' +
        'td.tvcell--name').click();
      await page.waitForSelector("#topogrid tr.tvrow--selected", { timeout: 15000 }).catch(() => {});
      push("[real] clicking a term row selects pitch_plate_attach_height in " +
        "place: the page stays the study, the model marks it, the preview pane shows it",
        await page.locator("div.kmverdict").count() === 2 &&
        await page.locator(navRow("kinematic", STUDY) + ".navtree__row--on").count() === 1 &&
        (await page.locator("#detail").innerText())
          .includes(edgeName("pitch_plate_attach_height")) &&
        await page.locator('#topogrid tr.tvrow--selected[data-id="pitch_plate_attach_height"]')
          .count() === 1 &&
        await page.evaluate(() => /map__jumper--selected/.test((document.querySelector(
          '#topopane svg.tv__map g.map__jumper[data-map-id="pitch_plate_attach_height"]') || { getAttribute: () => "" })
          .getAttribute("class") || "")));

      await boot("", null);
      await page.waitForSelector("tr.tvrow", { timeout: 15000 });
      push("[real] with no kinematic projection the nav has no kinematic section",
        await page.locator("h2.navtree__heading", { hasText: "Kinematic" }).count() === 0 &&
        await page.locator('[data-nav-kind="kinematic"]').count() === 0);
      // The stale-pair alarm is the STAMPS' to raise (a projection behind
      // trunk raises it on every boot), so the link is held to adding none
      // of its own: the same count as the paramless boot just above.
      const staleWithoutLink = await page.locator(".banner__stale").count();
      await boot("?kinematic=" + STUDY, null);
      await page.waitForSelector("tr.tvrow", { timeout: 15000 });
      push("[real] a kinematic link with no projection is a notice over the default view",
        // allInnerTexts, not innerText: an absent notice is this check's
        // failure, and innerText would wait out its timeout on one instead.
        /kinematic study/.test(
          (await page.locator(".banner__notice").allInnerTexts()).join(" ")) &&
        await page.locator("tr.tvrow").count() > 0 &&
        await page.locator(".banner__stale").count() === staleWithoutLink);

      await page.goto(servedBase + "/apps/viewer/topology.html?kinematic=" + STUDY,
        { waitUntil: "load" });
      // Either the page, or the notice that says the projection was not read.
      // `:visible` on both arms: a bare alternation resolves to every match and
      // waitForSelector waits on the DOM-first one, which a hidden verdict
      // (aborted this suite once, on the +72 stop's) never lets go.
      await page.waitForSelector("div.kmverdict:visible, .banner__notice:visible",
        { timeout: 15000 });
      push("[real] served over HTTP, the page reads the projection through the same transport",
        await page.locator("div.kmverdict").count() === 2 &&
        await page.locator("#topogrid tr.tvrow--edge").count() === 6);
    }
    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.closeAllConnections();
    server.close();
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
    // A nav ROW or a grid row: the picker's options carry data-nav-kind too
    // (2026-11-10) and an <option> is never "visible" to a wait.
    await page.waitForSelector('#navtree .navtree__row, tr.tvrow', { timeout: 15000 });
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

// --- the bind form: a pick survives an orbit, and names its end -------------
//
// (handoff a_face_pick_survives_an_orbit_and_names_its_end, 2026-10-21.) Jeff's
// first live use of the bind flow: "as soon as I went to rotate the view it
// deselected it", "I don't understand what 'direction' means", and a Bind
// nobody aimed that wrote the first event at the wrong end. Two claims a DOM
// shim cannot answer, so they are here and not in apps/annotate/run_tests.cjs:
//
//   1. A DRAG IS NOT A PICK. Real pointer input on the real canvas: press on
//      the picked face itself (the worst case -- under the old trigger that
//      press was a re-click, and cleared it), orbit a full turn, release, and
//      the face is still picked and the form is still up. The camera is
//      checked to have MOVED, or the drag proved nothing.
//   2. THE FORM NAMES THE TWO INTERFACES AND HAS NO DEFAULT. With both ends
//      open, Bind is disabled until an end is chosen; after one Bind the bound
//      end is shown as taken and the other preselected; and a second face
//      picked draws the leader between the two, before anything is written.
//
// ?mock=1 throughout: the fixture's `demo_edge_untraced` has its `to` end
// bound at face 0, and `demo_edge_traced` has nothing bound, which are the two
// states the form has.
async function testAnnotateBindForm(browser, label) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}/apps/annotate/index.html`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const picked = () => page.evaluate(() => window.__scene.highlightedFace());
  const formUp = async () => (await page.locator("#detail .bind-form").count()) === 1;
  const taskLine = async () => (await page.locator("#detail .an__task").textContent()) || "";
  const choices = () => page.evaluate(() => Array.from(
    document.querySelectorAll("#detail .an__ends .an__end")).map((n) => ({
    text: n.firstChild && n.classList.contains("an__end--taken")
      ? n.firstChild.textContent : n.textContent,
    direction: n.dataset.direction,
    taken: n.classList.contains("an__end--taken"),
    note: n.querySelector(".an__end-note") ? n.querySelector(".an__end-note").textContent : null,
    checked: n.getAttribute("aria-checked") === "true",
  })));
  const bindDisabled = () => page.locator("#detail .bind-form__bind").isDisabled();
  // Face the mock triangle and find a face's centroid on screen -- computed,
  // then CONFIRMED with the scene's own raycaster, the way the rail suite
  // aims (see the long note there on why the default camera is edge-on).
  const aimAt = (faceId) => page.evaluate((f) => {
    const scene = window.__scene;
    const sha = window.AnnotateApp.FIXTURES.demoSha;
    const mesh = scene.parts.get(sha);
    mesh.updateMatrixWorld(true);
    const centre = mesh.geometry.boundingBox.getCenter(mesh.position.clone())
      .applyMatrix4(mesh.matrixWorld);
    scene.camera.position.set(centre.x, centre.y, centre.z + 40);
    scene.camera.lookAt(centre.x, centre.y, centre.z);
    scene.controls.target.set(centre.x, centre.y, centre.z);
    scene.controls.update();
    scene.camera.updateMatrixWorld(true);
    const c = mesh.userData.manifest.faces[f].centroid_native;
    const point = mesh.position.clone().set(c[0], c[1], c[2]).applyMatrix4(mesh.matrixWorld);
    point.project(scene.camera);
    const hit = scene.pick(point.x, point.y);
    if (!hit || hit.faceId !== f) return null;
    const rect = document.querySelector("#canvas-host canvas").getBoundingClientRect();
    return { x: rect.left + ((point.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - point.y) / 2) * rect.height };
  }, faceId);
  // Position AND orientation: the aim below looks straight down the up axis,
  // where an azimuth orbit turns the camera without moving it.
  // A point that is ON the canvas (nothing drawn over it) and hits no part --
  // CONFIRMED both ways rather than assumed of a corner, which after an orbit
  // can sit on geometry or under the top bar's edge.
  const emptySpot = () => page.evaluate(() => {
    const canvas = document.querySelector("#canvas-host canvas");
    const r = canvas.getBoundingClientRect();
    for (const [fx, fy] of [[0.05, 0.9], [0.95, 0.9], [0.05, 0.5], [0.95, 0.5], [0.5, 0.95]]) {
      const x = r.left + fx * r.width, y = r.top + fy * r.height;
      if (document.elementFromPoint(x, y) !== canvas) continue;
      if (window.__scene.pick(fx * 2 - 1, -(fy * 2 - 1))) continue;
      return { x, y };
    }
    return null;
  });
  const cameraAt = () => page.evaluate(() => window.__scene.camera.position.toArray()
    .concat(window.__scene.camera.quaternion.toArray()));
  try {
    await page.goto(url + "?embedded=1&mock=1&topology=demo_system&edge=demo_edge_untraced",
      { waitUntil: "load" });
    await page.waitForSelector("#rail-filter", { state: "visible", timeout: 15000 });
    await page.waitForFunction(() => window.__scene &&
      window.__scene.parts.has(window.AnnotateApp.FIXTURES.demoSha), null, { timeout: 15000 });

    // --- 1. a drag is not a pick --------------------------------------------
    const at = await aimAt(1);
    push("the tier can find face 1 on screen, so the pointer input below is " +
      "real input on real geometry", at !== null);
    if (at) {
      await page.mouse.click(at.x, at.y);
      const first = await picked();
      push("a click (press and release in place) still picks the face",
        first && first.faceId === 1 && await formUp());
      // Press ON the picked face, orbit a full turn by drag, release.
      const canvasBox = await page.locator("#canvas-host canvas").boundingBox();
      const before = await cameraAt();
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
      await page.mouse.move(at.x + canvasBox.height / 2, at.y + 30, { steps: 12 });
      // Half way round, the camera is somewhere else -- read HERE, because a
      // full turn brings it back to where it started.
      const halfway = await cameraAt();
      const moved = before.some((v, i) => Math.abs(v - halfway[i]) > 1e-3);
      await page.mouse.move(at.x + canvasBox.height, at.y, { steps: 12 });
      await page.mouse.up();
      const kept = await picked();
      if (!moved || !kept || kept.faceId !== 1) {
        console.log(`    orbit: camera moved=${moved}, pick after=${JSON.stringify(kept)}`);
      }
      push("a drag that starts ON the picked face and orbits a full turn keeps " +
        "the pick and the bind form -- Jeff's own gesture after picking a face",
        moved && kept && kept.faceId === 1 && await formUp());
      // A drag that starts in empty space: the press used to clear the pick.
      const empty = await emptySpot();
      if (empty) {
        await page.mouse.move(empty.x, empty.y);
        await page.mouse.down();
        await page.mouse.move(empty.x + 90, empty.y - 60, { steps: 10 });
        await page.mouse.up();
      } else {
        console.log("    no confirmed empty spot on the canvas to press in");
      }
      const stillKept = await picked();
      push("...and so does a drag that starts in empty space",
        empty && stillKept && stillKept.faceId === 1 && await formUp());
      // ...while a plain click into empty space still clears it.
      const emptyAgain = await emptySpot();
      if (emptyAgain) await page.mouse.click(emptyAgain.x, emptyAgain.y);
      push("a plain click into empty space still clears the pick and the form",
        emptyAgain && (await picked()) === null && !(await formUp()));
    }

    // --- 2. one end bound: the other preselected, the leader drawn -----------
    await page.evaluate(() => window.AnnotateApp.exec(["select-face",
      window.AnnotateApp.FIXTURES.demoSha, "1"]));
    const oneBound = await choices();
    push("with one end bound, the form shows the bound end as taken, with its " +
      "face, and the remaining end preselected -- both by interface name",
      oneBound.length === 2 &&
      oneBound.some((c) => c.taken && c.text === "demo plate far face" &&
        /already bound · face 0/.test(c.note || "")) &&
      oneBound.some((c) => !c.taken && c.checked &&
        c.text === "demo bushing face against the plate") &&
      !(await bindDisabled()));
    const leader = await page.evaluate(() => window.__scene.bindLeader());
    push("...and the 3D view draws the leader from the picked face to the bound " +
      "one, in the pick colour, with the two interface names on it",
      leader && leader.picked.faceId === 1 && leader.bound.faceId === 0 &&
      leader.picked.label === "demo bushing face against the plate" &&
      leader.bound.label === "demo plate far face" && leader.color === "ff8c1a");

    // --- 3. both ends open: no default, Bind disabled until one is chosen ----
    await page.evaluate(() => window.AnnotateApp.exec(["select-edge", "demo_edge_traced"]));
    await page.evaluate(() => window.AnnotateApp.exec(["select-face",
      window.AnnotateApp.FIXTURES.demoSha, "0"]));
    const open = await choices();
    push("with both ends open, the form offers the two interfaces by name, " +
      "neither chosen, and Bind is disabled",
      open.length === 2 && open.every((c) => !c.taken && !c.checked) &&
      open.map((c) => c.text).join("|") ===
        "demo bolt-head bearing face|demo bushing face against the plate" &&
      await bindDisabled() && /^Choose which interface/.test(await taskLine()));
    push("...and no choice reads the stored direction word",
      open.every((c) => !/^(from|to)$/i.test(c.text.trim())));
    await page.locator("#detail .an__end", { hasText: "demo bolt-head bearing face" }).click();
    push("choosing an interface enables Bind and the instruction names it",
      !(await bindDisabled()) &&
      /as demo bolt-head bearing face\. The other face comes next\./.test(await taskLine()));
    // Asked AFTER an end is chosen: before it, the leader has no end to start
    // from either, so a leader that guessed the missing face would pass.
    push("...and no leader is drawn on a first bind, even with an end chosen",
      (await page.evaluate(() => window.__scene.bindLeader())) === null);
    await page.locator("#detail .bind-form__bind").click();
    await page.waitForFunction(() => /Wrote /.test(
      document.querySelector("#banner") ? document.querySelector("#banner").textContent : ""),
    null, { timeout: 5000 }).catch(() => {});
    const afterBind = await choices();
    push("after one Bind the form shows that end as taken and the other " +
      "preselected -- and the end it was written at is the one chosen",
      afterBind.some((c) => c.taken && c.direction === "from" &&
        c.text === "demo bolt-head bearing face" && /face 0/.test(c.note || "")) &&
      afterBind.some((c) => !c.taken && c.checked && c.direction === "to"));
    await page.evaluate(() => window.AnnotateApp.exec(["select-face",
      window.AnnotateApp.FIXTURES.demoSha, "1"]));
    const second = await page.evaluate(() => window.__scene.bindLeader());
    if (!second) console.log("    DIAG second leader: none; choices " + JSON.stringify(await choices()) +
      "; ends bound " + JSON.stringify(await page.evaluate(() => window.__endsBound("demo_system"))) +
      "; banner " + await page.evaluate(() => (document.querySelector("#banner") || {}).textContent) +
      "; writes " + JSON.stringify(await page.evaluate(() => (window.__mockWrites || []).map((w) => w.event))).slice(0, 900));
    push("picking the second face draws the leader between the two, before " +
      "anything more is written",
      second && second.picked.faceId === 1 && second.bound.faceId === 0 &&
      second.bound.label === "demo bolt-head bearing face");
    await page.evaluate(() => window.AnnotateApp.exec(["deselect", "face"]));
    push("letting the face go takes the leader down with it",
      (await page.evaluate(() => window.__scene.bindLeader())) === null);

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

// The leaders across the seam (handoff leaders_follow_the_active_study_
// across_the_seam, 2026-10-27): one page-level overlay from the active
// study's lit nodes on the DAG to where the scene draws them.
//
// The first half is the TRUTH check the handoff asks for: the annotator is
// booted in its mock, where no model layer posts anything, and a SYNTHETIC
// `annotate:anchors` message is posted from the pane's own window -- so the
// leader endpoints asserted below are the iframe's rect plus numbers this
// suite chose, not whatever a camera happened to show. The second half is the
// live P2 kinematic study with the real scene posting its own anchors, and
// photographs it when SEAM_LEADER_SHOTS names a directory.
const SEAM_LEADER_SHOTS = process.env.SEAM_LEADER_SHOTS || null;
const RESPINE_SHOTS = process.env.RESPINE_SHOTS || null;

// --- the Preview from the scene's side (a_preview_pane_replaces_the_hover_
// popups_and_one_record_backs_every_mark) ----------------------------------
//
// A 3D anchor previews and freezes exactly as its DAG dot does: the scene
// posts the anchor under its pointer (`annotate:hover`) and the anchor clicked
// (`annotate:pick`), and the page writes that node's record into the Preview.
// The messages are posted from the pane's own window, so the page's source
// check passes exactly as it does for the real scene; the fixture scene has no
// geometry to point at, and the scene's half -- which dot is under the pointer
// and what it posts -- is the annotator's fast tier
// (`AA.modelHoverMessage`, `AA.modelPickMessage`).
async function testPreviewFromTheScene(browser, label) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    if (location.pathname.indexOf("/apps/annotate/") === -1) return;
    if (!/[?&]mock=1(&|$)/.test(location.search)) {
      history.replaceState(null, "", location.pathname +
        (location.search ? location.search + "&" : "?") + "mock=1" + location.hash);
    }
  });
  const fromPane = (msg) => page.evaluate((msg) => {
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    if (!w) return false;
    new w.Function("msg", "window.parent.postMessage(msg, window.location.origin);")(msg);
    return true;
  }, msg);
  const previewIs = (state, key) => page.waitForFunction(([state, key]) => {
    const p = document.querySelector(".detail__preview");
    return !!p && p.getAttribute("data-preview-state") === state &&
      p.getAttribute("data-preview-key") === key;
  }, [state, key], { timeout: 5000 }).then(() => true).catch(() => false);
  try {
    await page.goto(url + "/apps/viewer/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });
    await page.waitForSelector("#pane-handle:visible", { timeout: 15000 }).catch(() => {});
    await page.locator("#pane-handle").click({ timeout: 5000 });
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 5000 });
    await page.waitForFunction(() => {
      const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
      return w && w.AnnotateApp && w.document.readyState === "complete";
    }, null, { timeout: 30000 });
    const returnMs = await page.evaluate(() => window.ViewerApp.PREVIEW_RETURN_MS);
    await page.mouse.move(4, 4);

    await fromPane({ type: "annotate:hover", kind: "node", id: "base_post_seat" });
    push("an anchor under the scene's pointer previews its node's record",
      await previewIs("hover", "node|base_post_seat") &&
      /base plate ⇔ post/.test(await page.locator(".detail__previewbody").textContent()));
    // The same record its interface's connector on the map previews,
    // character for character.
    const fromScene = await page.locator(".detail__previewbody").textContent();
    await fromPane({ type: "annotate:hover", kind: null, id: null });
    await page.locator('#topopane g.map__connector[data-map-id="base_post_seat"]').dispatchEvent("mouseenter");
    await previewIs("hover", "node|base_post_seat");
    push("the anchor's Preview and its map connector's are the same record",
      await page.locator(".detail__previewbody").textContent() === fromScene);
    await page.locator('#topopane g.map__connector[data-map-id="base_post_seat"]').dispatchEvent("mouseleave");
    await page.mouse.move(4, 4);
    await page.waitForTimeout(returnMs + 120);

    await fromPane({ type: "annotate:pick", kind: "node", id: "base_post_seat" });
    // Selected on the map as its node is: the interface's connector or a pin
    // of it, whichever entity the page holds for the node.
    const pickedOnMap = await page.evaluate(() => Array.from(document.querySelectorAll(
      '#topopane svg.tv__map [class*="--selected"][data-map-id]'))
      .map((n) => n.getAttribute("data-map-id")));
    console.log(`    the anchor pick selected on the map: ${JSON.stringify(pickedOnMap)}`);
    push("clicking an anchor freezes the Preview on it, and selects its node on the map",
      await previewIs("frozen", "node|base_post_seat") && pickedOnMap.length > 0 &&
      pickedOnMap.every((id) => id === "base_post_seat" || /@base_post_seat$/.test(id)));
    await fromPane({ type: "annotate:hover", kind: "node", id: "arm_tip" });
    push("with an anchor frozen, another anchor under the pointer previews that one",
      await previewIs("hover", "node|arm_tip"));
    await fromPane({ type: "annotate:hover", kind: null, id: null });
    push("...and off every anchor the Preview returns to the frozen one",
      await previewIs("frozen", "node|base_post_seat"));
    await fromPane({ type: "annotate:pick", kind: "node", id: "base_post_seat" });
    push("a second click on the frozen anchor lets it go, as the scene's own " +
      "second click does", await previewIs("empty", ""));
    await fromPane({ type: "annotate:pick", kind: "node", id: "base_post_seat" });
    await previewIs("frozen", "node|base_post_seat");
    await page.locator("#flyout-title").focus().catch(() => {});
    await page.keyboard.press("Escape");
    push("Escape lets an anchor-frozen Preview go too", await previewIs("empty", ""));
    await fromPane({ type: "annotate:pick", kind: "node", id: "not_a_node" });
    push("an anchor the page's topology does not carry selects nothing",
      await previewIs("empty", ""));
  } catch (err) {
    errors.push(String(err && err.stack || err));
  } finally {
    await page.close();
    server.closeAllConnections();
    server.close();
  }
  return reportSuite(label, checks, errors);
}

// The model drawn alone (the_scene_draws_the_model_alone_and_every_node_it_
// places_has_a_leader, 2026-11-08; its leaders across the seam retired with
// the rails, 2026-11-17). On the end-stop model -- a topology whose parts
// declare occurrences -- the 3D pane at rest and with the P2 run loaded
// draws that model's parts and no context, and one selection and one hover
// light the tree, the grid, the map and the scene. Real data only: the
// meshes, the run and the topology projection are the facts it is about.
const MODEL_ALONE_TOPOLOGY = "vpa_end_stop_v2";

async function testModelDrawnAloneAndLed(browser, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const errors = [];
  const model = topologies && (topologies.topologies || []).find((t) => t.id === MODEL_ALONE_TOPOLOGY);
  const kinematic = await readProjection("kinematic/kinematic_studies.json");
  const study = kinematic && (kinematic.studies || []).find((s) => s.id === SWEEP_RAIL_STUDY);
  const index = await realDataIndexForTheAnnotator();
  if (!model || !(model.parts || []).some((p) => p.occurrence) || !study ||
      index.runs.indexOf(study.sweep.run_id) === -1 || !index.meshes.length) {
    push("[real] the model drawn alone (skipped: the end-stop model with declared " +
      "occurrences, the P2 run or the meshes are not on disk -- build them, or pass --repo " +
      "<a root built from this tree>)", true);
    return reportSuite(label, checks, errors);
  }
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  // Tall, so most of the model's DAG dots are in the pane's view. Not all of
  // them: since the nested coloured bodies (2026-11-09) the pitch link's two
  // dots sit below a 1500px window, and the leader check reads "on screen".
  const page = await browser.newPage({ viewport: { width: 1700, height: 1500 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await installRealAnnotatorReads(page, { meshes: index.meshes, runs: index.runs,
    aliases: index.aliases, binding: "real" });
  const inPane = (fn, arg) => page.evaluate(({ src, arg }) => {
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    if (!w || !w.document) return null;
    return new Function("w", "arg", "return (" + src + ")(w, arg);")(w, arg);
  }, { src: fn.toString(), arg });
  const until = async (fn, arg, timeout) => {
    try {
      await page.waitForFunction(({ src, arg }) => !!new Function("arg",
        "return (" + src + ")(arg);")(arg), { src: fn.toString(), arg }, { timeout, polling: 100 });
      return true;
    } catch {
      return false;
    }
  };
  // What the scene draws, read until three reads 300ms apart agree with no
  // mesh load in flight: on a loaded box the loads pause long enough for
  // three reads to agree on a scene half drawn ("4 meshes drawn for 15").
  const drawnNow = () => inPane((w) => {
    const view = w.AnnotateApp.exec(["scene-view"]);
    return { loading: w.__scene._loading.size, drawn: view.filter((r) => r.visible).map((r) => ({ sha: r.sha256,
      at: w.__scene.drawnOccurrenceKeys(r.sha256).length })).sort((a, b) => (a.sha < b.sha ? -1 : 1)) };
  });
  const drawnSettled = async () => {
    let last = null, same = 0, now = null;
    const end = Date.now() + 120000;
    while (Date.now() < end) {
      const read = await drawnNow();
      now = JSON.stringify(read.drawn);
      same = now === last && read.loading === 0 ? same + 1 : 0;
      last = now;
      if (same >= 2) break;
      await page.waitForTimeout(300);
    }
    return JSON.parse(now || "[]");
  };
  try {
    await page.goto(url + "/apps/viewer/topology.html?topology=" + MODEL_ALONE_TOPOLOGY, { waitUntil: "load" });
    await pickModel(page, MODEL_ALONE_TOPOLOGY);
    await page.waitForSelector("tr.tvrow", { timeout: 30000 }).catch(() => {});
    // The whole model in 3D: the seam's handle opens the pane on the
    // picker's choice (the topology row and its 3D control left with the
    // rows, 2026-11-10).
    await page.waitForSelector("#pane-handle:visible", { timeout: 30000 });
    await page.locator("#pane-handle").click();
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
    await until(() => {
      const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
      return w && w.AnnotateApp && w.__scene && w.__scene.listOpenParts().length > 0;
    }, null, 120000);
    // The whole model, or two minutes: then settled, and counted exactly.
    await until((n) => {
      const w = document.querySelector("#annotate-flyout iframe").contentWindow;
      return w.AnnotateApp.exec(["scene-view"]).filter((r) => r.visible).length >= n;
    }, model.parts.length, 120000);
    // The meshes the model's parts are, resolved as the scene resolves them
    // (a mesh's own part id, then the alias table), and how many places each
    // is declared at. Two parts may be one mesh at two places (the two NAS77A3
    // flanged bushings, the two 214820-002 straight ones, 2026-11-19), so the
    // count is of meshes, and each such mesh is drawn at both its places.
    const aliasRows = index.aliases.aliases || index.aliases;
    const meshOf = (id) => index.meshes.find((m) => m.part_id === id) ||
      aliasRows.filter((a) => a.topology_part === id)
        .map((a) => index.meshes.find((m) => m.part_id === a.mesh_part_id)).find(Boolean) || null;
    const modelMeshes = {};
    for (const part of model.parts || []) {
      const mesh = meshOf(part.id);
      if (!mesh) continue;
      const at = modelMeshes[mesh.sha256] = modelMeshes[mesh.sha256] || { parts: [], declared: [] };
      at.parts.push(part.id);
      if (part.occurrence && at.declared.indexOf(part.occurrence) === -1) at.declared.push(part.occurrence);
    }
    const shared = Object.keys(modelMeshes).filter((sha) => modelMeshes[sha].parts.length > 1);
    const drawsTheModel = (drawn) => {
      const shas = drawn.map((r) => r.sha).sort().join();
      return shas === Object.keys(modelMeshes).sort().join() && shared.every((sha) => {
        const row = drawn.find((r) => r.sha === sha);
        return !!row && (!modelMeshes[sha].declared.length ||
          row.at === modelMeshes[sha].declared.length);
      });
    };
    const rest = await drawnSettled();
    const pinned = (model.parts || []).filter((p) => p.occurrence).length;
    console.log(`      [${label}] at rest: ${rest.length} meshes drawn for ${model.parts.length} parts ` +
      `(${pinned} with a declared occurrence; ${Object.keys(modelMeshes).length} meshes, ` +
      `shared ${JSON.stringify(shared.map((sha) => [modelMeshes[sha].parts, (rest.find((r) => r.sha === sha) || {}).at]))})`);
    push("[real] the end-stop model at rest draws as many parts as it has, and no context",
      drawsTheModel(rest));

    // The P2 run, loaded with no study.
    const runId = study.sweep.run_id;
    await inPane((w, r) => { w.AnnotateApp.exec(["sweep", r]); return true; }, runId);
    const built = await until((r) => {
      const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
      return w && w.__sweep && w.__sweep.artifact.runId === r && w.__sweep.bodies.length > 0 &&
        w.__model && w.__model.built && w.__model.built.runId === r && w.__model.built.bodies;
    }, runId, 240000);
    await inPane((w) => w.AnnotateApp.exec(["pause"]));
    await page.waitForTimeout(1500);
    // The Bodies list reads the model (cmdSweep's AA.sweepModelTree call): its
    // rows follow the topology's bodies[] -- order and part counts -- and
    // pitch_plate lists both piston heads. Derived from the projection, not
    // literals; deleting that call leaves the run's own bodies, in the run's order.
    const bodiesRail = await inPane((w) => Array.from(w.document.querySelectorAll(
      '#sweep-tree [data-group="bodies"] [data-body]')).map((n) => ({ id: n.dataset.body,
      parts: n.querySelectorAll(":scope > .an__tree-parts > .part-row").length,
    })));
    const declared = (model.bodies || []).map((b) => ({ id: b.id, parts: (b.parts || []).length }));
    const railIds = (bodiesRail || []).map((b) => b.id);
    const ordered = railIds.filter((id) => declared.some((d) => d.id === id));
    console.log(`      [${label}] Bodies list: ${JSON.stringify(bodiesRail && bodiesRail.map((b) => [b.id, b.parts]))}; ` +
      `declared ${JSON.stringify(declared.map((d) => [d.id, d.parts]))}`);
    push("[real] the Bodies list reads the model: its bodies come in the topology's bodies[] order, " +
      "each with that body's part count",
      declared.length > 0 && ordered.join() === declared.map((d) => d.id).join() &&
      declared.every((d) => (bodiesRail.find((b) => b.id === d.id) || {}).parts === d.parts));
    const plate = (model.bodies || []).find((b) => b.id === "pitch_plate");
    push("[real] and pitch_plate lists both piston heads",
      !!plate && (plate.parts || []).filter((p) => /^piston_head_/.test(p)).length === 2 &&
      (bodiesRail.find((b) => b.id === "pitch_plate") || {}).parts === plate.parts.length);
    const sweepDrawn = await drawnSettled();
    console.log(`      [${label}] P2 with no study: ${sweepDrawn.length} meshes drawn`);
    // In sweep mode the model is drawn alone: the sweep-only sites
    // (hideOutsideModel, the skip that keeps a carried bolt shut, the frame's
    // `outside` term) are what keep the context out once the run poses it.
    push("[real] with the P2 run loaded the end-stop model still draws as many parts as it has, " +
      "and no context", drawsTheModel(sweepDrawn));
    // And every part of one of its rigid bodies is posed WITH that body: a
    // part the model folds into a body the run's own part list does not name
    // (the piston heads into the plate, the cover into the base) rides that
    // body's subject rather than standing at its assembly position. A link's
    // pressed-in bearings are carried inside the link's occurrence, which
    // names no topology part, so links are left to the carried rows. A part
    // recorded inside a placed occurrence (215177's plate and its flanged
    // bushings, inside the plate assembly's) is carried there too: its row
    // names its mesh, not the part, so it counts by its mesh and -- where the
    // part declares one -- its occurrence (2026-11-19).
    const sweepRows = await inPane((w) => w.__sweep.bodies
      .filter((r) => r.placements && r.placements.length).map((r) => ({ subject: r.subject,
        part: r.part, state: r.state, sha: r.sha256, keys: r.placements.map((p) => p.key) })));
    const isPosed = (body, partId) => {
      const part = (model.parts || []).find((p) => p.id === partId) || {};
      const mesh = meshOf(partId);
      return sweepRows.some((r) => r.subject === body && (r.part === partId ||
        (r.state === "carried" && mesh && r.sha === mesh.sha256 &&
          (!part.occurrence || r.keys.indexOf(part.occurrence) !== -1))));
    };
    const unposed = (model.bodies || []).filter((b) => b.kind !== "link")
      .flatMap((b) => b.parts.filter((p) => !isPosed(b.id, p)).map((p) => b.id + "/" + p));
    console.log(`      [${label}] P2: parts of the model's bodies not posed with their body: ` +
      `${unposed.join(", ") || "-"}`);
    if (unposed.length) {
      console.log(`      [${label}] P2 rows: ` + JSON.stringify(await inPane((w) => w.__sweep.bodies
        .map((r) => [r.subject, r.part, r.state, (r.sha256 || "").slice(0, 8),
          (r.placements || []).map((p) => p.key.split("/").slice(-2).join("/"))]))));
    }
    push("[real] with the P2 run loaded every part of the end-stop model's bodies is posed with " +
      "its own body", (model.bodies || []).length > 0 && unposed.length === 0);

    // --- one selection across the seam (the_pane_follows_the_one_selection_
    // both_ways, 2026-11-12) -------------------------------------------------
    // With the run loaded: the page tells the pane its selection once, with
    // one verb; the pane letting go lets the page go; a grid row lights its
    // edge in the sweep rather than leaving it; Escape asks the pane whether a
    // pick is armed. Every command and rail gesture the page posts is heard
    // in the pane's own window.
    await inPane((w) => {
      w.__heard = [];
      w.addEventListener("message", (e) => {
        const m = e.data;
        if (m && m.type === "annotate:exec") w.__heard.push(m.command.join(" "));
        if (m && m.type === "annotate:rail") w.__heard.push("rail " + m.act);
      });
      return true;
    });
    const heard = () => inPane((w) => w.__heard.splice(0));
    const paneHolds = () => inPane((w) => ({ sweep: !!w.__sweep, armed: !!(w.__sweep && w.__sweep.armed),
      inspect: w.__sweep && w.__sweep.inspect ? w.__sweep.inspect.kind + " " + w.__sweep.inspect.name : null,
      dot: w.__model && w.__model.selected ? w.__model.selected.id : null }));
    const pageHolds = () => page.evaluate(() => ({
      rows: document.querySelectorAll("#navtree .navtree__row--on").length,
      dots: document.querySelectorAll("#topopane svg.tv__map g.map__pin--selected").length,
      preview: (document.querySelector(".detail__preview") || { getAttribute: () => null })
        .getAttribute("data-preview-state"),
    }));
    const ONE_FEATURE = "hub@hub_spindle_bore_axis";
    const selectOneFeature = async () => {
      if (!(await page.locator(`#navtree [data-nav-kind="feature"][data-nav-id="${ONE_FEATURE}"]`).count())) {
        await page.locator('#navtree [data-nav-twisty="p:hub"]').first().click().catch(() => {});
      }
      const row = page.locator(`#navtree [data-nav-kind="feature"][data-nav-id="${ONE_FEATURE}"]`).first();
      await row.scrollIntoViewIfNeeded().catch(() => {});
      await row.click({ timeout: 5000 }).catch(() => {});
      await until(() => {
        const w = document.querySelector("#annotate-flyout iframe").contentWindow;
        return w.__sweep && w.__sweep.inspect && w.__sweep.inspect.kind === "feature";
      }, null, 15000);
      await page.waitForTimeout(800);
    };
    await heard();
    await selectOneFeature();
    const dots = page.locator("#topopane svg.tv__map g.map__pin");
    const dotCount = Math.min(12, await dots.count());
    for (let i = 0; i < dotCount; i++) {
      await dots.nth(i).dispatchEvent("mouseenter").catch(() => {});
      await dots.nth(i).dispatchEvent("mouseleave").catch(() => {});
    }
    await page.mouse.move(4, 4);
    // ...and two full repaints (the window narrower, then back): a paint is
    // what re-runs the page's posts, so a post that is not deduped shows here.
    await page.setViewportSize({ width: 1500, height: 1500 });
    await page.waitForTimeout(800);
    await page.setViewportSize({ width: 1700, height: 1500 });
    await page.waitForTimeout(1500);
    const toldA = (await heard()).filter((c) => /^model select node |^inspect feature |^rail activate$/.test(c));
    const heldA = await paneHolds();
    console.log(`      [${label}] a feature selected, ${dotCount} map pins swept: told the pane ` +
      `${JSON.stringify(toldA)}; the pane holds ${JSON.stringify(heldA)}`);
    push("[real] a feature row selected, the pointer swept over a dozen DAG marks and the page " +
      "repainted: the page tells the pane once, with one verb, and the pane's rail holds the feature's end",
      dotCount >= 6 && toldA.length === 1 && /^model select node /.test(toldA[0]) &&
      /^feature /.test(heldA.inspect || "") && heldA.dot === null);

    // The pane lets go -- a second click on the bead or the bound face runs
    // `inspect clear` -- and the page lets go on every surface, re-asserting
    // nothing.
    await inPane((w) => { w.AnnotateApp.exec(["inspect", "clear"]); return true; });
    await until(() => !document.querySelector("#topopane svg.tv__map g.map__pin--selected"), null, 10000);
    await page.waitForTimeout(1500);
    const toldB = (await heard()).filter((c) => /^model select node |^inspect feature |^rail activate$/.test(c));
    const pageB = await pageHolds();
    const heldB = await paneHolds();
    console.log(`      [${label}] the pane let go: the page holds ${JSON.stringify(pageB)}, told the ` +
      `pane ${JSON.stringify(toldB)}; the pane holds ${JSON.stringify(heldB)}`);
    push("[real] the pane letting go of the end row lets the page go: no row, map pin or Preview stays " +
      "selected, and nothing re-selects it",
      pageB.rows === 0 && pageB.dots === 0 && pageB.preview !== "frozen" && toldB.length === 0 &&
      heldB.inspect === null);

    // A grid row: lit in the sweep, never a goto.
    await page.evaluate(() => {
      const cell = document.querySelector('tr.tvrow[data-id="tan_link_mount_height"] td.tvcell--name');
      if (cell) { cell.scrollIntoView({ block: "center" }); cell.click(); }
    });
    await page.waitForTimeout(3000);
    await page.mouse.move(4, 4);
    await page.waitForTimeout(1500);
    const toldC = await heard();
    const heldC = await paneHolds();
    console.log(`      [${label}] a grid row selected: told the pane ` +
      `${JSON.stringify(toldC.filter((c) => /^goto |^highlight |^sweep /.test(c)))}; the pane holds ` +
      `${JSON.stringify(heldC)}`);
    push("[real] a grid row selected with the run loaded lights its edge in the sweep: no goto, and the " +
      "sweep stays",
      heldC.sweep && !toldC.some((c) => /^goto /.test(c)) &&
      toldC.indexOf("highlight " + MODEL_ALONE_TOPOLOGY + " tan_link_mount_height") !== -1);

    // Escape: nothing armed lets go of the selection...
    await selectOneFeature();
    await page.locator("#flyout-title").focus().catch(() => {});
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1500);
    const pageD = await pageHolds();
    push("[real] Escape with nothing armed in the pane lets go of the selection, pressed " +
      "controls and all", pageD.rows === 0 && pageD.dots === 0);
    // ...and with a pick armed cancels the pick only. The body's own pick
    // action arms it: Correct or Pick a face on the model's line (a bound or
    // unbound feature, since 2026-11-12), or the last row of a suggested
    // end's list.
    await selectOneFeature();
    await page.locator('#navtree .navtree__featurebody [data-body-act="arm"], ' +
      '#navtree .navtree__featurebody [data-kind="action"]').last()
      .click({ timeout: 5000 }).catch(() => {});
    const armedD = await until(() => {
      const w = document.querySelector("#annotate-flyout iframe").contentWindow;
      return w.__sweep && w.__sweep.armed;
    }, null, 20000);
    await page.waitForTimeout(800);
    await page.locator("#flyout-title").focus().catch(() => {});
    await page.keyboard.press("Escape");
    await until(() => {
      const w = document.querySelector("#annotate-flyout iframe").contentWindow;
      return w.__sweep && !w.__sweep.armed;
    }, null, 10000);
    await page.waitForTimeout(1500);
    const pageE = await pageHolds();
    const heldE = await paneHolds();
    console.log(`      [${label}] Esc while armed (armed: ${armedD}): the page holds ` +
      `${JSON.stringify(pageE)}; the pane holds ${JSON.stringify(heldE)}`);
    push("[real] Escape with a pick armed cancels the pick and keeps the selection",
      armedD && !heldE.armed && pageE.dots === 1 && /^feature /.test(heldE.inspect || ""));

    // --- one rule lights all four surfaces, in two tiers (hover_and_select_
    // light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque,
    // 2026-11-12) ---------------------------------------------------------
    // The handoff's table, read off the merged page: the end-stop model with
    // the P2 run loaded, every entity kind hovered and selected from the
    // surface that draws it, and what the other three show. Ids are the
    // model's own, read off the projection; nothing here is a literal the
    // model could drift from.
    const HUB = "hub";
    const MOUNT = "tan_link_mount_215175_002";
    // `model` above is the topology projection; its `model` block is the
    // derived view the page's resolver reads (tolerance_stack/model_view.py).
    const view = model.model;
    const hubDims = (view.parts || []).find((p) => p.id === HUB).dimensions.slice().sort();
    const hubNodes = (view.parts || []).find((p) => p.id === HUB).features
      .map((fid) => view.features.find((f) => f.id === fid).node).sort();
    const PILOT = "hub_boss_in_tan_link_mount_pilot";
    const HUB_JOINT = "hub+" + MOUNT;
    const BASE_FACE = "tan_link_mount_hub_face";
    const aliases = index.aliases.aliases || index.aliases;
    const shaOf = (partId) => inPane((w, { id, meshes, aliases }) => {
      const m = w.AnnotateApp.resolveMeshIdentifier(meshes, id, aliases);
      return m ? m.sha256 : null;
    }, { id: partId, meshes: index.meshes, aliases });
    const sceneLooks = () => inPane((w) => w.AnnotateApp.exec(["scene-view"])
      .filter((r) => r.visible).map((r) => ({ sha: r.sha256, look: r.look, opacity: r.opacity })));
    const paneLight = () => inPane((w) => w.__lastLight || null);
    const uniq = (list) => Array.from(new Set(list)).sort();
    const pageLit = () => page.evaluate(() => {
      const q = (sel) => Array.from(document.querySelectorAll(sel));
      const ids = (nodes, attr) => nodes.map((n) => n.getAttribute(attr));
      const box = (n) => { const b = n.getBoundingClientRect(); return [b.top, b.bottom]; };
      const nav = document.getElementById("navtree").getBoundingClientRect();
      const onScreen = (n) => { const b = n.getBoundingClientRect(); return b.top >= nav.top && b.bottom <= nav.bottom; };
      // The map's marks (views/map.js): a pin is a feature (`part@node`), read
      // as its node; a box is a part, a district a body, by `data-map-id`.
      const mapIds = (sel) => q(sel).map((n) => n.getAttribute("data-map-id"));
      const nodeOf = (fid) => fid.slice(fid.indexOf("@") + 1);
      const M = "#topopane svg.tv__map ";
      return {
        treeOwn: ids(q("#navtree .navtree__row--hot"), "data-nav-id"),
        treeTouching: ids(q("#navtree .navtree__row--hot-touching"), "data-nav-id"),
        treeHolds: q("#navtree .navtree__row--holds, #navtree .navtree__row--holds-touching")
          .map((n) => n.getAttribute("data-nav-id") || n.getAttribute("data-nav-fold")),
        treeOn: ids(q("#navtree .navtree__row--on"), "data-nav-id"),
        treeOnTouching: ids(q("#navtree .navtree__row--on-touching"), "data-nav-id"),
        rowsOwn: ids(q("#topogrid tr.tvrow--lead"), "data-id"),
        rowsTouching: ids(q("#topogrid tr.tvrow--hot:not(.tvrow--lead)"), "data-id"),
        rowsSelected: ids(q("#topogrid tr.tvrow--selected"), "data-id"),
        rowsTouched: ids(q("#topogrid tr.tvrow--touched"), "data-id"),
        dotsOwn: mapIds(M + "g.map__pin--lead").map(nodeOf),
        dotsSelected: mapIds(M + "g.map__pin--selected").map(nodeOf),
        jumpersOwn: mapIds(M + "g.map__jumper--lead").sort(),
        connectorsOwn: mapIds(M + "g.map__connector--lead"),
        connectorsTouching: mapIds(M + "g.map__connector--hot:not(.map__connector--lead)"),
        containersOwn: mapIds(M + "rect.map__box--lead, " + M + "rect.map__district--lead"),
        containersTouching: mapIds(M + "rect.map__box--hot:not(.map__box--lead)"),
        containersSelected: mapIds(M + "rect.map__box--selected, " + M + "rect.map__district--selected"),
        bracesOwn: ids(q("#topogrid .tvbrace--lead"), "data-brace-entity"),
        bracesSelected: ids(q("#topogrid .tvbrace--selected"), "data-brace-entity"),
        drawn: (kind, id) => null,
        interfaceRow: (() => {
          const n = document.querySelector('#navtree [data-nav-kind="interface"][data-nav-id="hub_boss_in_tan_link_mount_pilot"]');
          return n ? { onScreen: onScreen(n), cls: n.className, box: box(n), nav: [nav.top, nav.bottom] } : null;
        })(),
        pilotEnd: !!document.querySelector('#navtree [data-nav-kind="feature"][data-nav-id="tan_link_mount_215175_002@tan_link_mount_pilot_bore"]'),
      };
    });
    const hoverNav = async (kind, id) => {
      const row = page.locator(navRow(kind, id)).first();
      await row.scrollIntoViewIfNeeded().catch(() => {});
      await row.hover({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
    };
    const leaveNav = async () => {
      await page.locator("#navtree h2.navtree__heading").first().hover({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
    };
    // Let go of the selection the Escape checks left, and open the hub. The
    // pointer leaves the body it last clicked first: a disagreement's body
    // (the hub's boss, until Jeff keeps a face) re-renders a face line under
    // where its Pick a face was, and a face line hovered lights its part.
    await page.mouse.move(4, 4);
    await page.locator("#flyout-title").focus().catch(() => {});
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    if (!(await page.locator(navRow("feature", HUB + "@hub_spindle_bore_axis")).count())) {
      await page.locator('#navtree [data-nav-twisty="p:hub"]').first().click({ timeout: 5000 }).catch(() => {});
    }
    const hubSha = await shaOf(HUB);
    const mountSha = await shaOf(MOUNT);
    const bladeSha = await shaOf("blade_root");
    const linkSha = await shaOf("pitch_link");
    // The scene at rest, before anything is lit: what every leave puts back.
    const restLooks = JSON.stringify(await sceneLooks());
    const sameAsRest = async () => JSON.stringify(await sceneLooks()) === restLooks;
    // Which model features hold a standing binding, read off the
    // feature-identity projection (the Python fold of the log the page is
    // served): since 2026-11-12 a feature shows its own binding, and one whose
    // faces disagree (the hub's locating boss, until Jeff keeps one) has none.
    // Null when the projection cannot be read.
    let boundTokens = null;
    try {
      const ident = JSON.parse(await readFile(join(DATA_REPO, "data", "projections", "feature-identity",
        "bindings.json"), "utf8"));
      boundTokens = new Set((ident.features || []).filter((r) => r.state === "bound")
        .map((r) => [r.feature_key.topology_id, r.feature_key.part, r.feature_key.node].join("|")));
    } catch { boundTokens = null; }
    const featureBound = (fid) => {
      const f = (view.features || []).find((x) => x.id === fid);
      return !!(f && boundTokens && boundTokens.has([f.identity.topology_id, f.identity.part, f.identity.node].join("|")));
    };
    // A lit part's (or a body's parts') interface partners: the far end of
    // every interface with an end on one of their features. One whose feature
    // is bound has its face overlaid in the touching tier, so its part ghosts
    // behind that face (AA.planLightLooks: a touching face's part is near);
    // every other part goes faint. Derived, so the next binding Jeff makes
    // moves the expectation with it rather than reddening the check.
    const ghostedPartners = (partIds) => {
      const mine = [].concat(...partIds.map((id) => ((view.parts || []).find((p) => p.id === id) || {}).features || []));
      const far = [];
      (view.interfaces || []).forEach((i) => {
        const ends = i.ends || [];
        if (ends.some((fid) => mine.indexOf(fid) !== -1)) {
          ends.filter((fid) => mine.indexOf(fid) === -1 && featureBound(fid)).forEach((fid) => far.push(fid));
        }
      });
      return uniq(far.map((fid) => (view.features || []).find((x) => x.id === fid).part));
    };

    // 1. a part hovered from the tree.
    await hoverNav("part", HUB);
    const hubHover = await pageLit();
    const hubLight = await paneLight();
    const hubLooks = await sceneLooks();
    const lookOf = (looks, sha) => (looks.find((r) => r.sha === sha) || {});
    // Every drawn part off its expected look: the lit parts ghost (their
    // resting look), a bound interface partner ghost, the rest faint.
    const looksOffRule = async (looks, litParts, partners) => {
      const ghosts = [];
      for (const pid of litParts.concat(partners)) ghosts.push(await shaOf(pid));
      return looks.filter((r) => r.look !== (ghosts.indexOf(r.sha) !== -1 ? "ghost" : "faint"));
    };
    const hubPartners = ghostedPartners([HUB]);
    const hubLookWrong = await looksOffRule(hubLooks, [HUB], hubPartners);
    console.log(`      [${label}] hub hovered: tree own ${JSON.stringify(uniq(hubHover.treeOwn))}, touching ` +
      `${JSON.stringify(uniq(hubHover.treeTouching))}, holds ${JSON.stringify(uniq(hubHover.treeHolds))}; grid own ` +
      `${JSON.stringify(hubHover.rowsOwn.sort())} (${hubDims.length} dimensions), touching ${JSON.stringify(hubHover.rowsTouching)}; ` +
      `map pins ${JSON.stringify(hubHover.dotsOwn.sort())}, jumpers ${JSON.stringify(hubHover.jumpersOwn)}, connectors touching ` +
      `${JSON.stringify(hubHover.connectorsTouching)}, ` +
      `containers ${JSON.stringify(hubHover.containersOwn)}; pane ${JSON.stringify(hubLight && hubLight.layers)}; looks hub ` +
      `${JSON.stringify(lookOf(hubLooks, hubSha))} mount ${JSON.stringify(lookOf(hubLooks, mountSha))} link ${JSON.stringify(lookOf(hubLooks, linkSha))} ` +
      `blade ${JSON.stringify(lookOf(hubLooks, bladeSha))}; expected grid own ${JSON.stringify(hubDims)}, touching ` +
      `${JSON.stringify(PILOT)}, dots ${JSON.stringify(hubNodes)}, ghosted partners ${JSON.stringify(hubPartners)} ` +
      `(bindings read ${!!boundTokens}); parts off their look ${JSON.stringify(hubLookWrong)}`);
    const hubOwnLayer = hubLight && hubLight.layers.find((l) => l.role === "hover" && l.tier === "own");
    push("[real] a part hovered in the tree lights the same thing on all four surfaces, in two tiers: its own " +
      "rows, pins, jumpers and box strong and its interfaces faint; in the scene its mesh " +
      "glows at its resting look with its bound faces harder, every other part faint, nothing opaque",
      !!boundTokens &&
      uniq(hubHover.treeOwn).length === 5 && hubHover.treeOwn.indexOf(HUB) !== -1 &&
      hubHover.treeTouching.indexOf("hub_blade1_root_bearing_bore") !== -1 &&
      hubHover.rowsOwn.slice().sort().join() === hubDims.join() &&
      hubHover.rowsTouching.join() === PILOT &&
      uniq(hubHover.dotsOwn).join() === hubNodes.join() && hubHover.jumpersOwn.join() === hubDims.join() &&
      hubHover.connectorsTouching.indexOf(PILOT) !== -1 && hubHover.connectorsOwn.length === 0 &&
      hubHover.containersOwn.indexOf(HUB) !== -1 &&
      !!hubOwnLayer && hubOwnLayer.partOverlays > 0 && hubOwnLayer.faceOverlays > 0 &&
      hubOwnLayer.faceOpacity > hubOwnLayer.partOpacity &&
      lookOf(hubLooks, hubSha).look === "ghost" && [mountSha, bladeSha, linkSha].every((s) => !!lookOf(hubLooks, s).look) &&
      hubLookWrong.length === 0 && hubLooks.every((r) => r.opacity < 1));
    await leaveNav();
    // `until` here runs in the page's own frame (the suite's helper above), so
    // the pane is reached through its iframe.
    const lightDown = () => {
      const w = document.querySelector("#annotate-flyout iframe").contentWindow;
      return w.__lastLight === null;
    };
    const leftDown = await until(lightDown, null, 10000);
    await page.waitForTimeout(500);
    const leftRest = await sameAsRest();
    const leftPage = await pageLit();
    if (!(leftDown && leftRest)) {
      const now = await sceneLooks();
      const was = JSON.parse(restLooks);
      console.log(`      [${label}] DIAG after leaving the hub row: light down ${leftDown}, looks differing from rest ` +
        JSON.stringify(now.map((r, i) => [r, was[i]]).filter(([a, b]) => JSON.stringify(a) !== JSON.stringify(b))) +
        ` (${now.length} now, ${was.length} at rest)`);
    }
    push("[real] ...and leaving the row takes every surface's light down, the scene back to rest",
      leftDown && leftRest && leftPage.rowsOwn.length === 0 && leftPage.treeOwn.length === 0);

    // 2. the part selected.
    await page.locator(navRow("part", HUB)).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.mouse.move(4, 4);
    await page.waitForTimeout(800);
    const hubSel = await pageLit();
    const hubSelLight = await paneLight();
    const hubSelLayer = hubSelLight && hubSelLight.layers.find((l) => l.role === "select" && l.tier === "own");
    const hubSelLooks = await sceneLooks();
    console.log(`      [${label}] hub selected: tree on ${JSON.stringify(uniq(hubSel.treeOn))}, on-touching ` +
      `${JSON.stringify(uniq(hubSel.treeOnTouching))}; grid selected ${JSON.stringify(hubSel.rowsSelected.sort())}, touched ` +
      `${JSON.stringify(hubSel.rowsTouched)}; map pins ${JSON.stringify(hubSel.dotsSelected.sort())}; boxes ` +
      `${JSON.stringify(hubSel.containersSelected)}; braces ${JSON.stringify(hubSel.bracesSelected)}; pane ${JSON.stringify(hubSelLight && hubSelLight.layers)}`);
    push("[real] a part selected is selected on all four surfaces: its rows, pins, box and bracket " +
      "wear the accent, the interfaces it touches the fainter accent, the folds down to every lit row open, " +
      "and in the scene its bound faces are overlaid harder than the part, which keeps its resting look",
      uniq(hubSel.treeOn).length === 5 && hubSel.treeOnTouching.indexOf(BASE_FACE) !== -1 &&
      hubSel.rowsSelected.slice().sort().join() === hubDims.join() && hubSel.rowsTouched.join() === PILOT &&
      uniq(hubSel.dotsSelected).join() === hubNodes.join() && hubSel.containersSelected.indexOf(HUB) !== -1 &&
      hubSel.bracesSelected.indexOf(HUB) !== -1 &&
      !!hubSelLayer && hubSelLayer.faceOverlays > 0 && hubSelLayer.partOverlays > 0 &&
      hubSelLayer.faceOpacity > hubSelLayer.partOpacity && lookOf(hubSelLooks, hubSha).look === "ghost" &&
      hubSelLooks.every((r) => r.opacity < 1));

    // 3. a body selected.
    await page.locator(navRow("body", "base")).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.mouse.move(4, 4);
    await page.waitForTimeout(800);
    const baseSel = await pageLit();
    const baseLight = await paneLight();
    const baseLayer = baseLight && baseLight.layers.find((l) => l.role === "select" && l.tier === "own");
    const baseLooks = await sceneLooks();
    const baseParts = (view.bodies || []).find((b) => b.id === "base").parts;
    const basePartners = ghostedPartners(baseParts);
    const baseLookWrong = await looksOffRule(baseLooks, baseParts, basePartners);
    console.log(`      [${label}] base selected: tree on ${uniq(baseSel.treeOn).length} rows, on-touching ` +
      `${JSON.stringify(uniq(baseSel.treeOnTouching))}; containers ${JSON.stringify(baseSel.containersSelected)}; pane ` +
      `${JSON.stringify(baseLight && baseLight.layers)}; opaque ${baseLooks.filter((r) => r.opacity >= 1).length}; ` +
      `ghosted partners ${JSON.stringify(basePartners)}; parts off their look ${JSON.stringify(baseLookWrong)}`);
    push("[real] a body selected lights every part it holds and the joints inside it, the joints to other bodies " +
      "fainter, its district and its parts' boxes in the accent, and every one of its parts glows at its " +
      "resting look -- nothing opaque",
      baseParts.every((p) => baseSel.treeOn.indexOf(p) !== -1) && baseSel.treeOn.indexOf("base") !== -1 &&
      baseSel.treeOn.indexOf(BASE_FACE) !== -1 && baseSel.treeOnTouching.indexOf("hub_blade1_root_bearing_bore") !== -1 &&
      baseSel.containersSelected.indexOf("base") !== -1 && baseParts.every((p) => baseSel.containersSelected.indexOf(p) !== -1) &&
      !!baseLayer && baseLayer.partOverlays >= baseParts.length && baseLooks.every((r) => r.opacity < 1) &&
      !!boundTokens && lookOf(baseLooks, hubSha).look === "ghost" && !!lookOf(baseLooks, linkSha).look &&
      baseLookWrong.length === 0);

    // 3b. Escape lets the body go (review of 2026-11-13, B1: the handler
    //     gated on the ELEMENT form of the selection, which a body, a part
    //     or a joint has none of, so the three new selectables could only be
    //     replaced, never released).
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    const lightGone = await until(() => {
      const w = document.querySelector("#annotate-flyout iframe").contentWindow;
      return w.__lastLight === null;
    }, null, 10000);
    await page.waitForTimeout(400);
    const released = await pageLit();
    const releasedRest = await sameAsRest();
    console.log(`      [${label}] Escape after the body selection: tree on ${uniq(released.treeOn).length}, containers ` +
      `${JSON.stringify(released.containersSelected)}, grid selected ${JSON.stringify(released.rowsSelected)}, pane light gone ${lightGone}, scene at rest ${releasedRest}`);
    push("[real] Escape lets go of a body selected from the tree: every surface back to rest -- no row, district, " +
      "box, bracket or pin in the accent, the pane's select layer gone, the scene at its resting looks",
      released.treeOn.length === 0 && released.treeOnTouching.length === 0 && released.containersSelected.length === 0 &&
      released.rowsSelected.length === 0 && released.dotsSelected.length === 0 && released.bracesSelected.length === 0 &&
      lightGone && releasedRest);

    // 3c. the body's district on the map selects it under a REAL pointer
    //     (review of 2026-11-13, B2, on the rails: a pan took pointer capture,
    //     so the mouseup and the click landed on the scroll section; a
    //     dispatched click or elementFromPoint could not see it). The press is
    //     on the district's top border, its wide transparent twin
    //     (`map__districthit`, `pointer-events: stroke`).
    const fieldPoint = await page.evaluate(() => {
      const r = document.querySelector('#topopane svg.tv__map rect.map__districthit[data-map-id="base"]');
      if (!r) return null;
      r.scrollIntoView({ block: "nearest", inline: "nearest" });
      const b = r.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + 1, onScreen: b.y >= 0 && b.y + 2 <= innerHeight && b.x >= 0 && b.x + b.width <= innerWidth };
    });
    let fieldTargets = null;
    if (fieldPoint && fieldPoint.onScreen) {
      await page.evaluate(() => {
        window.__fieldEv = [];
        const rec = (e) => window.__fieldEv.push(e.type + ":" + (e.target.tagName || "") + "." + (e.target.getAttribute ? (e.target.getAttribute("class") || "").split(" ")[0] : ""));
        for (const t of ["mousedown", "mouseup", "click"]) document.addEventListener(t, rec, { capture: true, once: true });
      });
      await page.mouse.move(fieldPoint.x - 3, fieldPoint.y);
      await page.mouse.move(fieldPoint.x, fieldPoint.y);
      await page.waitForTimeout(150);
      await page.mouse.down();
      await page.waitForTimeout(80);
      await page.mouse.up();
      await page.waitForTimeout(900);
      fieldTargets = await page.evaluate(() => window.__fieldEv);
    }
    const fieldSel = await pageLit();
    const fieldLight = await paneLight();
    const fieldLayer = fieldLight && fieldLight.layers.find((l) => l.role === "select" && l.tier === "own");
    console.log(`      [${label}] real pointer on the base body's field (${fieldPoint ? JSON.stringify(fieldPoint) : "no rect"}): ` +
      `down/up/click targets ${JSON.stringify(fieldTargets)}; tree on ${uniq(fieldSel.treeOn).length}, containers ${JSON.stringify(fieldSel.containersSelected)}`);
    push("[real] a real mouse down and up on a body's district border on the map selects the body -- the up and the " +
      "click land on the district, not on the drawing a pan captures for -- and it lights as the tree's row click did",
      !!fieldPoint && fieldPoint.onScreen && Array.isArray(fieldTargets) &&
      fieldTargets.some((e) => /^mouseup:rect\.map__districthit/.test(e)) && fieldTargets.some((e) => /^click:rect\.map__districthit/.test(e)) &&
      baseParts.every((p) => fieldSel.treeOn.indexOf(p) !== -1) && fieldSel.treeOn.indexOf("base") !== -1 &&
      fieldSel.containersSelected.indexOf("base") !== -1 && !!fieldLayer && fieldLayer.partOverlays >= baseParts.length);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);

    // 4. the locating boss selected from the Parts section: the pilot
    //    interface it is an end of opens and is on screen.
    await page.evaluate(() => { document.getElementById("navtree").scrollTop = 0; });
    await page.locator(navRow("feature", HUB + "@hub_spindle_bore_axis")).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.mouse.move(4, 4);
    await page.waitForTimeout(600);
    const bossSel = await pageLit();
    console.log(`      [${label}] locating boss selected: on ${JSON.stringify(uniq(bossSel.treeOn))}, on-touching ` +
      `${JSON.stringify(uniq(bossSel.treeOnTouching))}; interface row ${JSON.stringify(bossSel.interfaceRow)}; pilot end drawn ${bossSel.pilotEnd}`);
    push("[real] selecting the hub's locating boss from the Parts section opens the folds down to the pilot interface " +
      "it is an end of -- the Interfaces group, the hub-mount joint, the interface itself -- lights that row fainter " +
      "with the pilot bore across it, and scrolls it into view",
      bossSel.treeOn.indexOf(HUB + "@hub_spindle_bore_axis") !== -1 && !!bossSel.interfaceRow &&
      /navtree__row--on-touching/.test(bossSel.interfaceRow.cls) && bossSel.interfaceRow.onScreen &&
      bossSel.pilotEnd && bossSel.treeOnTouching.indexOf(MOUNT + "@tan_link_mount_pilot_bore") !== -1 &&
      bossSel.treeOnTouching.indexOf(HUB_JOINT) !== -1);

    // 5. an interface hovered (the base face, under the hub-mount joint now open).
    await hoverNav("interface", BASE_FACE);
    const ifaceHover = await pageLit();
    const ifaceLight = await paneLight();
    const ifaceLayer = ifaceLight && ifaceLight.layers.find((l) => l.role === "hover" && l.tier === "own");
    const ifaceLooks = await sceneLooks();
    const dimsAtBaseFace = (view.dimensions || []).filter((d) =>
      /@tan_link_mount_hub_face$/.test(d.from) || /@tan_link_mount_hub_face$/.test(d.to)).map((d) => d.id).sort();
    console.log(`      [${label}] base face hovered: tree own ${JSON.stringify(uniq(ifaceHover.treeOwn))}, touching ` +
      `${JSON.stringify(uniq(ifaceHover.treeTouching))}, holds ${JSON.stringify(uniq(ifaceHover.treeHolds))}; map pins ` +
      `${JSON.stringify(ifaceHover.dotsOwn)}; grid touching ${JSON.stringify(ifaceHover.rowsTouching.sort())} ` +
      `(dimensions at it: ${JSON.stringify(dimsAtBaseFace)}); pane ${JSON.stringify(ifaceLight && ifaceLight.layers)}`);
    push("[real] an interface hovered lights its connector, its pins and its own rows as own, the dimensions arriving at it as " +
      "touching rows, the fold hiding an end it owns marked, its bound face overlaid in the scene, and nothing opaque",
      ifaceHover.treeOwn.indexOf(BASE_FACE) !== -1 && ifaceHover.treeOwn.indexOf(HUB + "@" + BASE_FACE) !== -1 &&
      uniq(ifaceHover.dotsOwn).join() === BASE_FACE && ifaceHover.connectorsOwn.join() === BASE_FACE &&
      ifaceHover.rowsOwn.length === 0 &&
      ifaceHover.rowsTouching.slice().sort().join() === dimsAtBaseFace.join() &&
      ifaceHover.treeTouching.indexOf(HUB_JOINT) !== -1 &&
      !!ifaceLayer && ifaceLayer.faceOverlays > 0 && ifaceLooks.every((r) => r.opacity < 1));
    await leaveNav();

    // 6. a joint hovered.
    await hoverNav("joint", HUB_JOINT);
    const jointHover = await pageLit();
    const jointLooks = await sceneLooks();
    const jointNodes = uniq([BASE_FACE, "tan_link_mount_fastener_clocking", "hub_spindle_bore_axis", "tan_link_mount_pilot_bore"]);
    console.log(`      [${label}] hub-mount joint hovered: tree own ${JSON.stringify(uniq(jointHover.treeOwn))}, touching ` +
      `${JSON.stringify(uniq(jointHover.treeTouching))}; map pins ${JSON.stringify(uniq(jointHover.dotsOwn))}; connectors ` +
      `${JSON.stringify(uniq(jointHover.connectorsOwn))}; grid own ${JSON.stringify(jointHover.rowsOwn)}; containers touching ${JSON.stringify(jointHover.containersTouching)}; ` +
      `looks hub ${JSON.stringify(lookOf(jointLooks, hubSha))} mount ${JSON.stringify(lookOf(jointLooks, mountSha))} link ${JSON.stringify(lookOf(jointLooks, linkSha))}`);
    push("[real] a joint hovered lights its three interfaces -- their connectors and pins, the pilot gap's row -- as own and " +
      "the two parts it joins as touching, in the tree, on the map, in the grid and in the scene",
      uniq(jointHover.dotsOwn).join() === jointNodes.join() &&
      uniq(jointHover.connectorsOwn).join() === uniq([BASE_FACE, "tan_link_mount_fastener_clocking", PILOT]).join() &&
      jointHover.rowsOwn.join() === PILOT && jointHover.treeOwn.indexOf(HUB_JOINT) !== -1 &&
      jointHover.treeTouching.indexOf(HUB) !== -1 && jointHover.treeTouching.indexOf(MOUNT) !== -1 &&
      jointHover.containersTouching.indexOf(HUB) !== -1 && jointHover.containersTouching.indexOf(MOUNT) !== -1 &&
      lookOf(jointLooks, hubSha).look === "ghost" && lookOf(jointLooks, mountSha).look === "ghost" &&
      lookOf(jointLooks, linkSha).look === "faint" && jointLooks.every((r) => r.opacity < 1));
    await leaveNav();

    // 7. a gap edge hovered from the grid.
    await clearPoint(page, `#topogrid tr.tvrow[data-id="${PILOT}"] td.tvcell--name`, "hover").catch(() => {});
    await page.waitForTimeout(700);
    const gapHover = await pageLit();
    const gapLight = await paneLight();
    const gapLayer = gapLight && gapLight.layers.find((l) => l.role === "hover" && l.tier === "own");
    const gapLooks = await sceneLooks();
    const pilotEnds = (view.interfaces || []).find((i) => i.id === PILOT).ends;
    const dimsAtPilot = (view.dimensions || []).filter((d) =>
      pilotEnds.indexOf(d.from) !== -1 || pilotEnds.indexOf(d.to) !== -1).map((d) => d.id).sort();
    // Does either end hold a bound face? (featureBound, above) -- the overlay
    // is asked for exactly when one is. Unreadable bindings ask for it.
    const pilotBound = !boundTokens || pilotEnds.some(featureBound);
    console.log(`      [${label}] pilot gap hovered from the grid: own rows ${JSON.stringify(gapHover.rowsOwn)}, touching ` +
      `${JSON.stringify(gapHover.rowsTouching.sort())} (dimensions at its ends: ${JSON.stringify(dimsAtPilot)}); map pins ` +
      `${JSON.stringify(uniq(gapHover.dotsOwn))}; tree own ${JSON.stringify(uniq(gapHover.treeOwn))}; pane ` +
      `${JSON.stringify(gapLight && gapLight.layers)}; an end bound ${pilotBound}; opaque ${gapLooks.filter((r) => r.opacity >= 1).length}`);
    push("[real] a gap edge hovered from the grid lights its row, its connector and its two end pins as own, the dimensions " +
      "at its ends as touching, its row and its ends in the tree, overlays its bound face in the scene, and no part goes solid",
      gapHover.rowsOwn.join() === PILOT && gapHover.rowsTouching.slice().sort().join() === dimsAtPilot.join() &&
      gapHover.connectorsOwn.join() === PILOT &&
      uniq(gapHover.dotsOwn).join() === uniq(["hub_spindle_bore_axis", "tan_link_mount_pilot_bore"]).join() &&
      gapHover.treeOwn.indexOf(PILOT) !== -1 && gapHover.treeOwn.indexOf(HUB + "@hub_spindle_bore_axis") !== -1 &&
      (pilotBound ? !!gapLayer && gapLayer.faceOverlays > 0 : !(gapLayer && gapLayer.faceOverlays > 0)) &&
      gapLooks.length > 0 && gapLooks.every((r) => r.opacity < 1));
    await page.mouse.move(4, 4);
    await page.waitForTimeout(600);

    // 8. the same with no sweep loaded (bind mode). The selection step 4
    //    left is let go first: a light with a selection in it is not nothing.
    await page.locator("#flyout-title").focus().catch(() => {});
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    await inPane((w) => { w.AnnotateApp.exec(["sweep", "off"]); return true; });
    await until(() => {
      const w = document.querySelector("#annotate-flyout iframe").contentWindow;
      return w && !w.__sweep && w.__scene && w.__scene.listOpenParts().length > 0;
    }, null, 60000);
    await page.waitForTimeout(1500);
    const bindRest = JSON.stringify(await sceneLooks());
    await hoverNav("part", HUB);
    const bindLight = await until(() => {
      const w = document.querySelector("#annotate-flyout iframe").contentWindow;
      return !!(w.__lastLight && w.__lastLight.layers.some((l) =>
        l.role === "hover" && l.tier === "own" && l.partOverlays > 0));
    }, null, 10000);
    const bindLooks = await sceneLooks();
    const bindHubSha = await shaOf(HUB);
    console.log(`      [${label}] bind mode, hub hovered: light ${bindLight}; looks hub ` +
      `${JSON.stringify(lookOf(bindLooks, bindHubSha))}, opaque ${bindLooks.filter((r) => r.opacity >= 1).length} of ${bindLooks.length}`);
    push("[real] with no sweep loaded the same hover reaches the 3D pane: the hub glows at its resting look, " +
      "every other part goes faint, and nothing is opaque",
      bindLight && bindLooks.length > 1 && lookOf(bindLooks, bindHubSha).look === "ghost" &&
      bindLooks.filter((r) => r.sha !== bindHubSha).every((r) => r.look === "faint" || r.look === "ghost") &&
      bindLooks.some((r) => r.look === "faint") && bindLooks.every((r) => r.opacity < 1));
    // Bind mode's rest is its own (the sweep's scope is gone): read before
    // the hover, compared after the leave.
    await leaveNav();
    const bindDown = await until(lightDown, null, 10000);
    await page.waitForTimeout(500);
    const bindAfter = await sceneLooks();
    if (!bindDown) console.log(`      [${label}] DIAG bind-mode leave: light down ${bindDown}; looks ${JSON.stringify(bindAfter)}`);
    push("[real] ...and leaving it in bind mode puts every part back at rest",
      bindDown && JSON.stringify(bindAfter) === bindRest);
  } catch (err) {
    errors.push(String(err && err.stack || err));
  } finally {
    await page.close();
    server.closeAllConnections();
    server.close();
  }
  return reportSuite(label, checks, errors);
}

// The annotator draws a frame only when something changed (handoff the_
// annotate_scene_renders_only_when_something_changed). `scene.renderCount` is
// the count of frames actually drawn; the rAF loop itself keeps ticking.
async function testAnnotateRenderOnDemand(browser, label) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}/apps/annotate/index.html`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const rendered = () => page.evaluate(() => window.__scene.renderCount);
  try {
    await page.goto(url + "?embedded=1&mock=1&topology=demo_system&edge=demo_edge_untraced",
      { waitUntil: "load" });
    await page.waitForFunction(() => window.__scene &&
      window.__scene.parts.has(window.AnnotateApp.FIXTURES.demoSha), null, { timeout: 15000 });
    // Let load-time work (part open, framing, resize) finish drawing.
    await page.waitForTimeout(1500);
    const before = await rendered();
    await page.waitForTimeout(1000);
    const still = (await rendered()) - before;
    push("a still scene (no input, no sweep playing) draws no frames over a second",
      still === 0);
    const box = await page.locator("#canvas-host canvas").boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const beforeDrag = await rendered();
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 120, y + 40, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    push("an orbit drag draws at least one frame", (await rendered()) > beforeDrag);
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

    // The annotate pane's rail is laid out but not shown, because the shell
    // draws the same rows in its own nav (apps/annotate/style.css,
    // `body.an--embedded`). The suites below that open the pane's document on
    // its own (top level, `embedded=1`) read and click those rows, so they get
    // the rail shown; the pane inside the shell's iframe is left as it ships.
    const newPage = browser.newPage.bind(browser);
    browser.newPage = async (...args) => {
      const page = await newPage(...args);
      // The bottom of everything the page pins at its top -- the page bar and
      // the view filters under it -- measured off the DOM, not asked of the
      // app: the line a pinned grid header, a Fit and a landing are all
      // measured against (the_dag_holds_still_and_the_filter_bar_stays_put).
      await page.addInitScript(() => {
        // The top of the DAG's own region (the fixed shell, 2026-11-14): its
        // drawing is seen from there down; nothing above it is pinned over it.
        window.__pinnedBottom = () => {
          const dag = document.querySelector("#topopane .tv__hscroll");
          const r = dag ? dag.getBoundingClientRect() : null;
          return r && r.height > 0 ? r.top : 0;
        };
      });
      await page.addInitScript(() => {
        if (window.parent !== window) return;
        document.addEventListener("DOMContentLoaded", () => {
          if (!document.body.classList.contains("an--embedded")) return;
          const style = document.createElement("style");
          style.textContent = "body.an--embedded .an { grid-template-columns: 260px 1fr; }" +
            "body.an--embedded .an__rail { position: static; visibility: visible; pointer-events: auto; width: auto; }";
          document.head.appendChild(style);
        });
      });
      return page;
    };

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
    // them. The `suite` field of a mutation spec is a third
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
      ["popover mechanics (the stack page's citation card)", (label) =>
        testPopoverMechanics(browser, fileBase, label)],
      ["deep links file://", (label) => testDeepLinks(browser, fileBase, label)],
      ["deep links http", (label) => testDeepLinks(browser, baseUrl, label)],
      ["topology height budget", (label) =>
        testHeightBudget(browser, fileBase, label, topologies, crops)],
      ["the DAG zoom, Fit and the grid header", (label) =>
        testDagZoom(browser, fileBase, label, topologies, crops)],
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
      ["3D pane follows the selection (sweep, bind, reload, hover)", (label) =>
        testThreeDPane(browser, fileBase, label, topologies)],
      ["every study opens in 3D showing only its parts", (label) =>
        testEveryStudyOpensIn3D(browser, label, topologies)],
      ["annotate rail filter + face deselect", (label) =>
        testAnnotateRail(browser, label)],
      ["annotate sweep rail (the mechanism, contributors, re-pick, bind snapshot)", (label) =>
        testAnnotateSweepRail(browser, label, topologies)],
      ["annotate armed pick (pose, isolate, filter, pre-select, bind, Esc)", (label) =>
        testAnnotateArmedPick(browser, label)],
      ["annotate rail suggestion (the row says so, select lights it, Accept, pick a different face)", (label) =>
        testAnnotateRailSuggestion(browser, label, topologies)],
      ["annotate rail holds still (bodies under Bodies, joint words, framing, the second face)", (label) =>
        testAnnotateRailHoldsStill(browser, label, topologies)],
      ["annotate rail and scene (hover, pick, per-body visibility, type chips, gap alerts)", (label) =>
        testAnnotateRailAndScene(browser, label, topologies)],
      ["annotate hosted posture (no folder grant off-machine)", (label) =>
        testAnnotateHostedPosture(browser, label, topologies)],
      ["the scene pane reads over HTTP (drawing-checker's mounts, no grant)", (label) =>
        testScenePaneOverHttp(browser, label)],
      ["annotate top bar + entry context (auto-filter, see-through)", (label) =>
        testAnnotateTopBar(browser, label)],
      ["annotate face suggestions (candidate colours, the pick, the switch)", (label) =>
        testAnnotateSuggestions(browser, label)],
      ["crop lightbox (launch, zoom, pan on the live crops)", (label) =>
        testCropLightbox(browser, label, topologies, crops)],
      ["typography pass's visual rules (live stack view)", (label) =>
        testTypographyRules(browser, label, topologies)],
      ["kinematic study page (deep link, chart hover, contributors, no projection)",
        (label) => testKinematicStudyPage(browser, fileBase, label, topologies,
          realResults, crops)],
      ["point export (pick two points, download, parse the file)", (label) =>
        testSweepExport(browser, fileBase, label, topologies, crops)],
      ["annotate bind form (a drag keeps the pick, the ends by name, the leader)", (label) =>
        testAnnotateBindForm(browser, label)],
      ["annotate renders on demand (a still scene draws nothing, an orbit draws)", (label) =>
        testAnnotateRenderOnDemand(browser, label)],
      ["annotate model in the scene (anchors, lines, the sweep, the anchors message)", (label) =>
        testAnnotateModelInTheScene(browser, fileBase, label, topologies)],
      ["the Preview from the scene (anchor hover and pick)", (label) =>
        testPreviewFromTheScene(browser, label)],
      ["the model drawn alone (the end-stop model's parts only, one light on the tree, the grid, the map and the scene)", (label) =>
        testModelDrawnAloneAndLed(browser, label, topologies)],
      ["a suggestion names its face and the mate ranks the other side (hover, Take, armed mates, nothing opposite)",
        (label) => testSuggestionNamesItsFace(browser, label, topologies)],
      ["a pattern is bound as its like faces and a face can be added (the offer, Take all, the fit, Add a face, Shift-click, the filter)",
        (label) => testPatternAndAddAFace(browser, label, topologies)],
      ["a bound pattern offers the whole pattern on the other part (the line, the head offer, the hover, Take)",
        (label) => testOppositePattern(browser, label, topologies)],
      ["a press that writes says so at once (the pitch plate's Keep: pending in the frame, one event, the body, the time)",
        (label) => testAPressThatWritesSaysSo(browser, label, topologies)],
      ["the map (the counts on both models, the one selection on four surfaces, the view)",
        (label) => testTheMap(browser, label, topologies)],
      ["a window resize re-clamps the pane and the map (5120 to 1920, no reload)",
        (label) => testWindowResizeReclamps(browser, label, topologies)],
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
    // scripts/mutation_witnesses/ is a whole copy of one of these keys.
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
    const timings = [];
    const runStarted = Date.now();
    for (const [label, runSuiteFn] of chosen) {
      const suiteStarted = Date.now();
      const checksBefore = RAN_NAMES.length;
      const result = await runSuiteFn(label);
      timings.push({ suite: label, checks: RAN_NAMES.length - checksBefore,
        seconds: (Date.now() - suiteStarted) / 1000 });
      if (!result || result.label !== label) {
        console.log(`    dispatched as ${JSON.stringify(label)}, reported ` +
          `itself as ${JSON.stringify(result && result.label)}`);
        console.log("    FAIL sub-check: " +
          "every suite prints the registry key it was dispatched under — a " +
          "--only filter is copied straight off that line, and every `suite` " +
          "in scripts/mutation_witnesses/ is a whole copy of one");
        if (result) result.ok = false;
      }
      results.push(result || { label, ok: false });
    }

    // The scan is falsifiable from this side: a name this run printed that the
    // guard scan never found is a guard the census cannot see (and so cannot
    // pin or enroll), however many suites ran it. Interpolated names are
    // accounted for by their template. Only this direction -- see
    // CENSUS_LIMITS.browser_scan_unverified for why not equality.
    const scanMisses = ranNotDeclared(RAN_NAMES);
    if (scanMisses.length) {
      console.log(`\nSCANNER MISS -- ${scanMisses.length} sub-check(s) ran that ` +
        "the guard scan in scripts/guard_enumeration.mjs never found, so no " +
        "census pin or mutation spec can see them:" +
        scanMisses.map((n) => `\n  ${JSON.stringify(n)}`).join(""));
      process.exitCode = 1;
    }

    // A `[real]` sub-check that found no data on disk passes as "(skipped: ...)",
    // inside a green total. Name every one, so a run record shows which real
    // checks did not run -- the rail-suggestion check skipped on the model v2
    // tactical and review runs and first ran on trunk, red (2026-11-08).
    const skipped = RAN_NAMES.filter((n) => /\(skipped\b/.test(n));
    if (skipped.length) {
      console.log(`\nSKIPPED -- ${skipped.length} sub-check(s) passed without running ` +
        `(no data under ${DATA_REPO}):` + skipped.map((n) => `\n  ${n}`).join(""));
    }

    await reportTimings(timings, (Date.now() - runStarted) / 1000);

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
