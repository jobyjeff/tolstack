// The smallest browser runner there is, for tests/test_browser_runner.py to end
// in each of the ways a real runner ends, and then look for its Chrome.
//
//   node tests/browser_runner_witness.mjs <how>
//
// It launches Chrome through scripts/browser_runner.mjs exactly as the real
// runners do, inside the same try/finally they use, opens one tiny page, prints
// READY, and waits. Then:
//
//   signal   waits to be sent Ctrl-Break (the helper's handler closes Chrome)
//   exit     on a line of stdin, process.exit()s with Chrome still open (the
//            helper's exit handler is the only thing left to close it)
//   throw    on a line of stdin, throws inside the try (the finally closes it)
import { createInterface } from "node:readline";
import { takeTheBrowserSlot, loadPlaywright, launchBrowser }
  from "../scripts/browser_runner.mjs";

const HOW = process.argv[2];
const HOWS = ["signal", "exit", "throw"];
if (!HOWS.includes(HOW)) {
  console.error(`usage: node tests/browser_runner_witness.mjs <${HOWS.join("|")}>`);
  process.exit(2);
}

takeTheBrowserSlot();
const { chromium } = await loadPlaywright();
const browser = await launchBrowser(chromium, { channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto("data:text/html,<title>witness</title><p>witness</p>");
  console.log("READY");
  const line = () => new Promise((resolve) =>
    createInterface({ input: process.stdin }).once("line", resolve));
  if (HOW === "signal") await new Promise(() => setInterval(() => {}, 60000));
  await line();
  if (HOW === "exit") process.exit(3);
  throw new Error("thrown inside the runner, on purpose");
} finally {
  await browser.close();
}
