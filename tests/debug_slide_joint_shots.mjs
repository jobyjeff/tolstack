// Debug script (handoff the_slide_joint_is_the_mounts_bushings_against_the_piston_body,
// 2026-11-03): screenshots the live viewer's kinematic study with the 3D pane
// open, so the lesson can show where 213668-002 is drawn once its sidecar
// records its assembly occurrence. Reads the server on 8000; writes PNGs into
// docs/sessions/shots_20261103_the_slide_joint_is_the_mounts_bushings/.
//
//   node tests/debug_slide_joint_shots.mjs [base-url]
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright, closeEveryBrowser } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = normalize(join(HERE, "..", "docs", "sessions", "shots_20261103_the_slide_joint_is_the_mounts_bushings"));
const BASE = process.argv[2] || "http://127.0.0.1:8000/tolstack";
const SHOTS = [
  ["1_kinematic_study_scene.png",
   BASE + "/annotate/index.html?sweep=vpa-pitch-p2-20261016-235852&kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops"],
];
const { chromium } = await loadPlaywright();
let browser = null;
for (const channel of ["chrome", "msedge"]) {
  try { browser = await launchBrowser(chromium, { channel, headless: true }); break; } catch {}
}
if (!browser) { console.error("no browser channel"); process.exit(1); }
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  for (const [name, url] of SHOTS) {
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(25000);
    console.log(name, "->", page.url());
    await page.screenshot({ path: join(OUT, name) });
  }
  // The base body's rows, then 213668-002 alone.
  await page.getByText(/^base · \d+ parts?$/).first().click();
  await page.waitForTimeout(1500);
  const mountRow = page.locator("text=/213668/").first();
  console.log("mount row:", await mountRow.count() ? await mountRow.innerText() : "(none)");
  await page.screenshot({ path: join(OUT, "2_base_body_rows.png") });
  const isolate = mountRow.locator("xpath=ancestor::*[.//button[normalize-space()='Isolate']][1]")
    .getByRole("button", { name: "Isolate" }).first();
  if (await isolate.count()) {
    await isolate.click();
    await page.waitForTimeout(8000);
    await page.screenshot({ path: join(OUT, "3_mount_isolated.png") });
  } else {
    console.log("no Isolate control on the mount row");
  }
  // The joints group, where the plate's slide is listed.
  const joints = page.getByRole("button", { name: "joints" }).first();
  if (await joints.count()) {
    await joints.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(OUT, "4_joints.png") });
  }
} finally {
  await closeEveryBrowser();
}
