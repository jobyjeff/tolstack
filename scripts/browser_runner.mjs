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
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = normalize(join(HERE, ".."));
const MAIN_CHECKOUT = normalize("C:/workspace/tolstack");
const IS_WINDOWS = process.platform === "win32";

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

/** Starts a browser the way every runner here must: capped, and closed on exit. */
export async function launchBrowser(chromium, options = {}) {
  installHandlers();
  const browser = await chromium.launch(options);
  const pid = capTheNewBrowser([...capped]);
  if (pid) capped.add(pid);
  open.set(browser, pid);
  browser.on("disconnected", () => open.delete(browser));
  return browser;
}

/** Closes every browser still open; never throws, never waits past the grace. */
export async function closeEveryBrowser() {
  const closing = [...open.keys()].map((b) => b.close().catch(() => {}));
  await Promise.race([Promise.all(closing),
    new Promise((resolve) => setTimeout(resolve, CLOSE_GRACE_MS).unref())]);
  killWhatIsLeft();
}

function killWhatIsLeft() {
  for (const [browser, pid] of open) {
    if (pid) {
      spawnSync("taskkill", ["/T", "/F", "/PID", String(pid)],
        { stdio: "ignore", windowsHide: true });
    }
    open.delete(browser);
  }
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
        console.error(`browser runner: ${signal}; closing the browser`);
        closeEveryBrowser().finally(() => process.exit(128 + number));
      });
    } catch (_) {
      // A signal this platform cannot listen for.
    }
  }
  // process.exit() and an uncaught throw skip every `finally` and every await:
  // only synchronous work runs here, so what is still open is killed outright.
  process.on("exit", killWhatIsLeft);
}
