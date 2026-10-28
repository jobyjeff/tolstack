// Hand-run inspection probe for handoff
// a_study_shows_the_worksheet_and_joint_of_the_stack_it_folds (2026-10-27).
// NOT a tier -- pytest never collects it and no runner calls it. Its job is the
// screenshots the handoff's definition of done asks for, committed so they can
// be re-taken.
//
//   node tests/debug_study_worksheets.mjs --repo C:/workspace/tolstack
//   node tests/debug_study_worksheets.mjs --repo C:/workspace/tolstack \
//        --shots docs/sessions/shots_20261027_study_worksheets
//
// `--repo` is where data/ is (the main checkout, or a scratch root whose
// projections were built from this tree); every app file and every worksheet
// under docs/ is served from THIS tree. LIVE DATA, never ?mock=1: the claim is
// that each folded grip stack's sheet and joint block are on the product
// model's page when one of its studies is selected.
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser } from "../scripts/browser_runner.mjs";

// Queues for the machine's browser slot (scripts/browser_runner.mjs).
takeTheBrowserSlot();

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

// One study per folded stack: the tan link's has a joint and no sheet.
const STUDIES = [
  "pitch_link_shank_out",
  "rotor_fastener_grip_u2h",
  "vpa_output_shank_out",
  "tan_link_take2_worst_case_protrusion",
];
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png",
  ".svg": "image/svg+xml", ".md": "text/markdown",
};

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

const say = (line) => console.log(line);

async function shot(page, name) {
  if (!SHOTS) return;
  const file = join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file });
  say(`    wrote ${file}`);
}

const server = await startServer();
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await launchBrowser(chromium, { channel: "chrome" });

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => say(`  PAGE ERROR: ${e}`));
  await page.goto(`${url}/apps/viewer/topology.html`, { waitUntil: "load" });
  await page.waitForSelector('[data-nav-kind="study"]', { timeout: 20000 });

  for (const [i, studyId] of STUDIES.entries()) {
    const row = page.locator(`[data-nav-kind="study"][data-nav-id="${studyId}"]`);
    await row.click();
    await page.waitForSelector(
      `[data-nav-kind="study"][data-nav-id="${studyId}"].navtree__row--on`, { timeout: 10000 });
    await page.waitForFunction(() => !window.ViewerApp.lastTopoRender.tweening,
      null, { timeout: 10000 });
    // The joint block is a collapsed <details>: open it, as a reader would.
    const joint = page.locator("#topojoint details.sv__joint");
    await joint.locator("summary").click();
    await joint.scrollIntoViewIfNeeded();
    const jointText = (await joint.textContent()).replace(/\s+/g, " ").trim();
    say(`${studyId}: joint -- ${jointText.slice(0, 120)}...`);
    await shot(page, `${i + 1}a_${studyId}_joint`);
    const toggle = page.locator("#worksheet-toggle");
    if (!(await toggle.isVisible())) {
      say(`${studyId}: no worksheet toggle (its stack has no sheet of its own)`);
      continue;
    }
    await toggle.click();
    await page.waitForSelector("#worksheet-dialog[open]", { timeout: 10000 });
    await page.waitForFunction(() => {
      const body = document.querySelector("#worksheet-dialog div.worksheet__body");
      return body && body.textContent.trim().length > 0;
    }, null, { timeout: 10000 });
    const head = await page.locator("#worksheet-dialog").textContent();
    const file = (head.match(/WORKSHEET_[a-z0-9_]+\.md/) || ["(no file named)"])[0];
    say(`${studyId}: worksheet dialog shows ${file}`);
    await shot(page, `${i + 1}b_${studyId}_worksheet`);
    await page.locator("#worksheet-close").click();
  }
} finally {
  await browser.close();
  server.close();
}
