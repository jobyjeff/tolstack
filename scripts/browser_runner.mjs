// What every tolstack script that starts a Chrome shares: it queues for the
// machine's one browser slot, keeps its Chrome to a few cores, and closes that
// Chrome on every way out.
//
// WHY ANY OF THIS (2026-10-21, handoff browser_runners_take_the_slot_and_
// free_the_box). One agent's diagnostic held ~13 of this workstation's 32 cores
// for twenty minutes, froze Jeff's own browser and every other agent, and its
// Chrome was still spinning 24 minutes after the node that started it was gone
// (ISSUE_20261021_a_browser_diagnostic_held_thirteen_cores_...). Three
// separate defects, and this file is one answer to each:
//
//   takeTheBrowserSlot()  two browser runs from anywhere on the machine never
//                         share it: the second WAITS for dispatch's browser slot.
//   launchBrowser()       the Chrome it starts runs on BROWSER_CORES cores, not
//                         on the whole box, whatever the page does.
//   (its handlers)        a run that ends -- normally, by a throw, by
//                         process.exit, by Ctrl-C/Ctrl-Break or a closed
//                         console -- leaves no Chrome behind.
//
// Every runner calls both, so the rule is in the code rather than in a prompt
// somebody has to have read: a human at a terminal gets the same queue and the
// same bound as an agent.
import childProcess, { spawnSync } from "node:child_process";
import { existsSync, writeSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = normalize(join(HERE, ".."));
const MAIN_CHECKOUT = normalize("C:/workspace/tolstack");
const IS_WINDOWS = process.platform === "win32";

// A measurement seam for tests/test_browser_runner.py: with this set, every step
// of the close writes one `BROWSER RUNNER TRACE {json}` line to stderr,
// synchronously (fd 2), so the lines written from the `exit` event survive.
const TRACE_ENV = "TOLSTACK_BROWSER_RUNNER_TRACE";
function trace(event, fields = {}) {
  if (!process.env[TRACE_ENV]) return;
  try {
    writeSync(2, `BROWSER RUNNER TRACE ${JSON.stringify({ event, t: Date.now(), ...fields })}\n`);
  } catch (_) { /* a closed stderr: nothing to tell */ }
}

// --- the slot ---------------------------------------------------------------
//
// dispatch owns the slot (`dispatch slot run --class browser -- <argv>`,
// dispatch/dispatch/slot.py): an OS lock, a kill-on-close job around the
// child, and DISPATCH_SLOT_HELD=browser in the child's environment so a nested
// call runs at once instead of waiting on itself. Its venv lives only in
// dispatch's main checkout, so the interpreter is spelled absolute.
export const DISPATCH_PYTHON = "C:/workspace/dispatch/.venv/Scripts/python.exe";
export const SLOT_HELD_ENV = "DISPATCH_SLOT_HELD";
export const SLOT_CLASS = "browser";
// dispatch's exit code for "gave up waiting" (--max-wait): EX_TEMPFAIL.
export const SLOT_GAVE_UP = 75;
// The pid of the process that re-ran itself under the slot. Its child watches
// it: blocked in spawnSync, the wrapper cannot pass a kill on, so a wrapper
// killed outright would otherwise leave the real run going underneath it.
const WRAPPER_ENV = "TOLSTACK_BROWSER_SLOT_WRAPPER";
const WRAPPER_POLL_MS = 2000;

/** True when an ancestor already holds the browser slot for this process. */
export function slotHeld(env = process.env) {
  return String(env[SLOT_HELD_ENV] || "").split(/[\s,;]+/).includes(SLOT_CLASS);
}

/**
 * Returns only when this process may start a browser now. Otherwise it re-runs
 * this same script, same argv, under the browser slot and exits with that run's
 * exit code -- so call it before doing anything a second copy would repeat.
 */
export function takeTheBrowserSlot() {
  if (slotHeld()) {
    watchTheWrapper();
    return;
  }
  if (!existsSync(DISPATCH_PYTHON)) {
    console.error(`browser slot: no dispatch at ${DISPATCH_PYTHON}; running unqueued`);
    return;
  }
  const argv = [...process.execArgv, ...process.argv.slice(1)];
  const run = spawnSync(DISPATCH_PYTHON,
    ["-m", "dispatch.cli", "slot", "run", "--class", SLOT_CLASS, "--",
     process.execPath, ...argv],
    { stdio: "inherit", env: { ...process.env, [WRAPPER_ENV]: String(process.pid) } });
  if (run.error) {
    console.error(`browser slot: could not start dispatch (${run.error.message}); running unqueued`);
    return;
  }
  if (run.status === SLOT_GAVE_UP) {
    console.error("browser slot: gave up waiting for the machine's browser slot " +
      `(exit ${SLOT_GAVE_UP}) -- nothing ran, so this is not a test result`);
  }
  process.exit(run.status === null ? 1 : run.status);
}

function watchTheWrapper() {
  const wrapper = Number(process.env[WRAPPER_ENV]);
  if (!wrapper) return;
  setInterval(() => {
    try {
      process.kill(wrapper, 0);
    } catch (err) {
      if (err.code === "EPERM") return;        // alive, just not ours to signal
      console.error(`browser slot: the run that queued this one (pid ${wrapper}) is gone; stopping`);
      closeEveryBrowser().finally(() => process.exit(1));
    }
  }, WRAPPER_POLL_MS).unref();
}

// --- playwright-core --------------------------------------------------------

/**
 * playwright-core from this tree or, from a worktree, the main checkout (its
 * node_modules is gitignored, so a worktree has none of its own).
 */
export async function loadPlaywright() {
  for (const root of [REPO, MAIN_CHECKOUT]) {
    const entry = join(root, "node_modules", "playwright-core", "index.js");
    if (!existsSync(entry)) continue;
    // playwright-core's entry is CommonJS, so an ESM `import()` of it puts
    // the whole module.exports on `.default` and detects no named exports --
    // `import { chromium }` would be `undefined`, which fails later and
    // misleadingly at `chromium.launch`. A script that imports the package by
    // NAME resolves its ESM wrapper and does not hit this; this resolves a
    // path, because from a worktree the package only exists in the main
    // checkout.
    const mod = await import(pathToFileURL(entry).href);
    return mod.chromium ? mod : mod.default;
  }
  throw new Error(
    "playwright-core is not installed in this tree or in the main checkout — " +
    "this tier cannot run here, which is a skip and not a pass");
}

// --- the bound --------------------------------------------------------------
//
// THE CAUSE IT BOUNDS. Headless Chrome on this machine has no GPU, so WebGL is
// SwiftShader -- software rasterisation, spread over a thread per core -- and
// the annotator's scene renders on every animation frame whether or not
// anything moved. With real meshes loaded a frame takes longer than a frame, so
// the GPU process never idles and takes every core it can get: ~13 in the
// 2026-10-21 incident. A smaller fixture or a shorter wait would bound one page;
// this bounds every page in every runner, whatever it draws.
//
// HOW: scripts/browser_cpu_cap.py puts the new Chrome in a job hard-capped at
// BROWSER_CORES of the machine (its docstring says why a job and not affinity,
// which Chrome undoes). It needs a Python, which a worktree borrows from the
// main checkout like everything else gitignored.
export const BROWSER_CORES = 4;
const CAP_SCRIPT = join(HERE, "browser_cpu_cap.py");
const PYTHONS = [REPO, MAIN_CHECKOUT].map(
  (root) => join(root, "venv-win", "Scripts", "python.exe"));

/** Caps the browser this process just launched; returns its top pid, or undefined. */
function capTheNewBrowser(skip) {
  if (!IS_WINDOWS) return undefined;
  const python = PYTHONS.find((path) => existsSync(path));
  if (!python) {
    console.error(`browser cap: no Python at ${PYTHONS.join(" or ")}; ` +
      "this browser may use every core");
    return undefined;
  }
  const run = spawnSync(python, [CAP_SCRIPT, String(process.pid), String(BROWSER_CORES),
    ...(skip.length ? ["--skip", ...skip.map(String)] : [])],
    { encoding: "utf-8", windowsHide: true });
  if (run.status !== 0) {
    console.error("browser cap: could not cap this browser at " +
      `${BROWSER_CORES} cores; it may use every core ` +
      `(${(run.stderr || String(run.error || "")).trim()})`);
  }
  const pid = Number((run.stdout || "").trim());
  return pid > 0 ? pid : undefined;
}

// --- the close --------------------------------------------------------------
//
// Every launched browser, with the pid of its top Chrome process where it could
// be read, until it disconnects.
const open = new Map();
// Every top browser pid already capped, open or not: a later cap must not take it.
const capped = new Set();
let handlersInstalled = false;
// Signals a run can be ended by. SIGBREAK is Ctrl-Break and SIGHUP a closed
// console window on Windows; SIGTERM never arrives there (it is a TerminateProcess,
// which no handler sees) but does everywhere else.
const SIGNALS = { SIGINT: 2, SIGTERM: 15, SIGBREAK: 21, SIGHUP: 1 };
const CLOSE_GRACE_MS = 5000;

// Playwright hands out no pid for a launched browser, but it starts it with
// child_process.spawn from inside this process, so the pid is seen here. The cap
// script's pid (the values of `open`) is the same Chrome; either is a root.
const browserRoots = new Set();
const spawnOnce = Symbol.for("tolstack.browser_runner.spawn");
if (!childProcess.spawn[spawnOnce]) {
  const realSpawn = childProcess.spawn;
  childProcess.spawn = function spawn(command, ...rest) {
    const child = realSpawn.call(this, command, ...rest);
    if (/(^|[\\/])(chrome|msedge)(\.exe)?$/i.test(String(command)) && child && child.pid) {
      browserRoots.add(child.pid);
      child.once("exit", () => browserRoots.delete(child.pid));
    }
    return child;
  };
  childProcess.spawn[spawnOnce] = true;
}

/** Starts a browser the way every runner here must: capped, and closed on exit. */
export async function launchBrowser(chromium, options = {}) {
  installHandlers();
  killed = false;                    // a new browser is a new kill pass
  const browser = await chromium.launch(options);
  const pid = capTheNewBrowser([...capped]);
  if (pid) capped.add(pid);
  open.set(browser, pid);
  browser.on("disconnected", () => open.delete(browser));
  return browser;
}

/**
 * Ends every browser still open; never throws. On Windows that is the same
 * bounded kill-and-wait the `exit` event runs (see killWhatIsLeft), not a
 * `browser.close()`: measured 2026-10-22 under load in drawing-checker, a
 * graceful close ran out its grace while Chrome's children were still tearing
 * down, the browser had already disconnected, and so nothing waited for them.
 */
export async function closeEveryBrowser() {
  if (IS_WINDOWS) {
    killWhatIsLeft("close");
    return;
  }
  const closing = [...open.keys()].map((b) => b.close().catch(() => {}));
  await Promise.race([Promise.all(closing),
    new Promise((resolve) => setTimeout(resolve, CLOSE_GRACE_MS).unref())]);
  open.clear();
}

// How long node may wait, after the kill, for every Chrome process it killed to
// be GONE. Past it, node exits anyway and says so on stderr (never silently).
export const KILL_WAIT_BOUND_MS = 60000;
// The line that says so: grep a runner's output for it.
export const LEFT_RUNNING = "BROWSER LEFT RUNNING";

// Set once a kill pass has run. After a signal, closeEveryBrowser kills and
// waits, then process.exit fires the `exit` event; a root whose exit code is not
// yet set still reads alive() there, so without this the same tree would be
// taskkilled and waited on (up to the whole bound) a second time.
let killed = false;

// Synchronous, because it also runs from the `exit` event, where nothing async
// runs. A clean run closed its browser in a `finally`, so nothing is open and
// no Chrome it started is still running: it pays nothing here.
function killWhatIsLeft(path = "exit") {
  if (killed) {
    trace("kill-skip", { path });
    return;
  }
  const roots = [...new Set([...browserRoots, ...[...open.values()].filter(Boolean)])].filter(alive);
  trace("kill-start", { path, open: open.size, roots });
  if (!open.size && !roots.length) return;
  killed = true;
  open.clear();
  if (!IS_WINDOWS || !roots.length) return;
  // `taskkill /T /F` names every process it kills, one line each:
  //   SUCCESS: The process with PID 15588 (child process of PID 54860) has been terminated.
  // Only the FIRST pid on a line is a killed process -- the second is its
  // parent, which for a root is this node itself, and waiting for node to be
  // gone from inside node always ran the whole bound (measured 2026-10-22).
  const ids = new Set(roots);
  const killedAt = Date.now();
  for (const root of roots) {
    const t0 = Date.now();
    const out = spawnSync("taskkill", ["/T", "/F", "/PID", String(root)],
      { encoding: "utf8", windowsHide: true, timeout: 15000 });
    for (const line of String(out.stdout || "").split(/\r?\n/)) {
      const m = /PID (\d+)/.exec(line);
      if (m) ids.add(Number(m[1]));
    }
    trace("taskkill", { root, status: out.status, ms: Date.now() - t0 });
  }
  ids.delete(process.pid);
  const t1 = Date.now();
  const left = waitUntilGone([...ids], KILL_WAIT_BOUND_MS, killedAt);
  trace("waited", { ids: [...ids], ms: Date.now() - t1, left });
  if (left.length) {
    console.error(`${LEFT_RUNNING}: Chrome process(es) ${left.join(", ")} were still ` +
      `running ${KILL_WAIT_BOUND_MS} ms after taskkill; node is exiting anyway`);
  }
}

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

// Returns the pids still running when the bound ran out. "Gone" here means the
// process's handle is SIGNALLED, which is what anything waiting on it (or
// wanting its profile dir's files) sees -- NOT `process.kill(pid, 0)`, which
// says gone as soon as the exit code is set: Windows sets that when the last
// thread ends, and on this box a killed Chrome then stayed un-signalled for
// 1-30+ s (measured 2026-10-22, drawing-checker's
// tests/debug_kill_witness_under_load.py). Node cannot wait on a pid it did not
// spawn, so PowerShell opens the handles. A pid no longer in the process list is
// gone; one whose process STARTED after the kill is a recycled pid, a stranger,
// and is not waited on.
function waitUntilGone(pids, budgetMs, killedAt = Date.now()) {
  if (!pids.length) return [];
  const ps = [
    `$deadline = [DateTime]::UtcNow.AddMilliseconds(${budgetMs})`,
    `$killedAt = [DateTimeOffset]::FromUnixTimeMilliseconds(${killedAt}).UtcDateTime`,
    "$left = @()",
    `foreach ($id in @(${pids.join(",")})) {`,
    "  try { $p = [System.Diagnostics.Process]::GetProcessById($id) } catch { continue }",
    "  try { if ($p.StartTime.ToUniversalTime() -gt $killedAt) { continue } } catch { }",
    "  $ms = [Math]::Max(0, [int]($deadline - [DateTime]::UtcNow).TotalMilliseconds)",
    "  try { if (-not $p.WaitForExit($ms)) { $left += $id } } catch { $left += $id }",
    "}",
    "$left -join ','",
  ].join("\n");
  const out = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps],
    { encoding: "utf8", windowsHide: true, timeout: budgetMs + 30000 });
  if (out.error || out.status !== 0) {
    // PowerShell did not answer: fall back to the exit-code poll, which is
    // weaker but never claims a running process is gone.
    trace("wait-fallback", { error: String(out.error || out.stderr || out.status) });
    const until = Date.now() + budgetMs;
    const nap = new Int32Array(new SharedArrayBuffer(4));
    while (pids.some(alive) && Date.now() < until) Atomics.wait(nap, 0, 0, 25);
    return pids.filter(alive);
  }
  return String(out.stdout || "").trim().split(",").filter(Boolean).map(Number);
}

function installHandlers() {
  if (handlersInstalled) return;
  handlersInstalled = true;
  let ending = false;
  for (const [signal, number] of Object.entries(SIGNALS)) {
    try {
      process.on(signal, () => {
        if (ending) process.exit(128 + number);   // a second signal: go now
        ending = true;
        trace("signal", { signal });
        console.error(`browser runner: ${signal}; closing the browser`);
        closeEveryBrowser().finally(() => process.exit(128 + number));
      });
    } catch (_) {
      // A signal this platform cannot listen for.
    }
  }
  // process.exit() and an uncaught throw skip every `finally` and every await:
  // only synchronous work runs here, so what is still open is killed outright.
  process.on("exit", (code) => { trace("exit", { code }); killWhatIsLeft("exit"); });
}
