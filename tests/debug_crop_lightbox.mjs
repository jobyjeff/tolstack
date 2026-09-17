// Hand-run inspection probe for handoff crop_lightbox_zoom_viewer (2026-09-16).
// NOT a tier -- pytest never collects it and no runner calls it. Its job is the
// screenshots the handoff's definition of done asks for, and it is committed
// for the reason the previous sessions' probes were: a screenshot nobody can
// re-take is a screenshot nobody can check.
//
//   node tests/debug_crop_lightbox.mjs --repo C:/workspace/tolstack
//   node tests/debug_crop_lightbox.mjs --repo C:/workspace/tolstack \
//        --shots docs/sessions/lessons
//
// `--repo` is the worktree escape hatch every real-data probe in this repo
// takes: data/ is gitignored and lives only in the main checkout, so the static
// server below serves /data/... from there while every app file comes from THIS
// tree. Without --shots it only prints what it measured.
//
// LIVE DATA, never ?mock=1, and that is the whole point: the claim these shots
// carry is that a DATASHEET-TABLE crop is legible at full size with its
// highlighted cell still boxed, and the mock fixture's crops are 1x1 stand-ins
// with invented rects. The subject is the `fastener_grip_13` dimension of
// `tan_link_to_pitch_plate_take2` -- the NAS6403-NAS6420 grip table, sheet 3,
// resolved by `spec_pile` through a `declared_region`, which is exactly the
// highlighted-cell-in-a-table case Jeff's note was about.
//
// Reached as a TOPOLOGY, not as a stack leaf, and that is not a detail: every
// live stack carrying this crop is either re-expressed by a topology or
// superseded by a later take, so the nav offers none of them (VA.looseStacks --
// one system, one entry). The route a reader actually has is the topology's
// grid row, whose preview pane renders the same crop.
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const PREFIX = "LESSONS_20260916_crop_lightbox_zoom_viewer";
const TOPOLOGY = "tan_link_to_pitch_plate_take2";
const EDGE = "fastener_grip_13";
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
      // READ first, then write the headers: a missing file throws, and a throw
      // after writeHead(200) leaves the catch below unable to answer at all.
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

// The launcher is quiet until its figure is hovered (style.css) and fades in
// over 120ms, so a screenshot taken the moment it EXISTS shows nothing at all
// -- which is what the first take of shots 1 and 5 showed. Hover the figure,
// then wait for the fade to finish, then shoot.
async function revealLauncher(page, scope) {
  await page.locator(`${scope} div.cropfig`).first().hover();
  await page.waitForFunction((sel) => {
    const button = document.querySelector(`${sel} button.cropfig__launch`);
    return button && Number(getComputedStyle(button).opacity) > 0.9;
  }, scope, { timeout: 5000 });
}

async function shot(page, name, opts) {
  if (!SHOTS) return;
  const file = join(SHOTS, `${PREFIX}_${name}.png`);
  await page.screenshot({ path: file, ...(opts || {}) });
  console.log(`    wrote ${file}`);
}

// The one measurement this probe exists to make, and the one the fast tier
// cannot: where the highlight box actually LANDS on the picture, in real laid
// out pixels, as a fraction of the picture's own box. That fraction is the
// crop index's `frac` and it must not move when the picture is scaled -- which
// is the whole claim behind putting the overlay in the DOM instead of burning
// it into the PNG.
async function measure(page) {
  return page.evaluate(() => {
    const figure = document.querySelector("#crop-lightbox div.cropfig");
    const img = figure && figure.querySelector("img");
    const box = figure && figure.querySelector("div.crophl");
    if (!figure || !img || !box) return null;
    const i = img.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const handle = window.ViewerApp.openCropLightboxHandle();
    return {
      scale: handle ? handle.view().scale : null,
      image: { width: round(i.width), height: round(i.height),
               left: round(i.left), top: round(i.top) },
      highlight: { width: round(b.width), height: round(b.height) },
      // The box's top-left as a fraction of the picture's own box.
      within: { x: round6((b.left - i.left) / i.width),
                y: round6((b.top - i.top) / i.height) },
      span: { x: round6(b.width / i.width), y: round6(b.height / i.height) },
    };
    function round(v) { return Math.round(v * 100) / 100; }
    function round6(v) { return Math.round(v * 1e6) / 1e6; }
  });
}

const server = await startServer();
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: "chrome" });

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => say(`  PAGE ERROR: ${e}`));
  await page.goto(`${url}/apps/viewer/topology.html`, { waitUntil: "load" });
  await page.waitForSelector('[data-nav-kind="topology"]', { timeout: 20000 });

  // --- the preview pane's crop, and the launcher on it ----------------------
  await page.locator(
    `[data-nav-kind="topology"][data-nav-id="${TOPOLOGY}"]`).click();
  const row = page.locator(`tr.tvrow[data-id="${EDGE}"]`);
  await row.waitFor({ timeout: 10000 });
  await row.click();
  const launcher = page.locator("#detail button.cropfig__launch");
  await launcher.waitFor({ timeout: 15000 });
  say(`the preview pane's crop of ${EDGE} carries a launcher`);
  await revealLauncher(page, "#detail");
  await shot(page, "1_preview_pane_launcher_on_the_crop");

  // --- (a) the lightbox, at fit ---------------------------------------------
  await launcher.click();
  await page.waitForSelector("#crop-lightbox[open]", { timeout: 10000 });
  await page.waitForFunction(() => {
    const box = document.querySelector("#crop-lightbox div.crophl");
    return box && box.getBoundingClientRect().width > 0;
  }, null, { timeout: 10000 });
  const fit = await measure(page);
  say(`open at fit: scale ${fit.scale}, picture ${fit.image.width}x` +
      `${fit.image.height}, highlight ${fit.highlight.width}x` +
      `${fit.highlight.height} at ${JSON.stringify(fit.within)}`);
  await shot(page, "2_datasheet_crop_at_full_size_highlight_aligned");

  // --- (b) zoomed in on the highlighted cell --------------------------------
  //
  // Real gestures, not the handle: the wheel over the box's own centre is what
  // a reader does, and it is also what proves the anchor arithmetic is wired
  // to the pointer rather than to the stage's corner.
  const centre = await page.evaluate(() => {
    const b = document.querySelector("#crop-lightbox div.crophl")
      .getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.mouse.move(centre.x, centre.y);
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -120);
  await page.waitForFunction(() => {
    const handle = window.ViewerApp.openCropLightboxHandle();
    return handle && handle.view().scale > 3;
  }, null, { timeout: 10000 });
  const zoomed = await measure(page);
  say(`zoomed: scale ${zoomed.scale}, picture ${zoomed.image.width}x` +
      `${zoomed.image.height}, highlight ${zoomed.highlight.width}x` +
      `${zoomed.highlight.height} at ${JSON.stringify(zoomed.within)}`);
  const drift = Math.max(
    Math.abs(zoomed.within.x - fit.within.x),
    Math.abs(zoomed.within.y - fit.within.y),
    Math.abs(zoomed.span.x - fit.span.x),
    Math.abs(zoomed.span.y - fit.span.y));
  say(`the highlight's position WITHIN the picture drifted by ${drift} ` +
      `(a fraction of the picture's box) across a ` +
      `${(zoomed.scale / fit.scale).toFixed(2)}x zoom`);
  await shot(page, "3_zoomed_on_the_highlighted_cell");

  // --- a drag, to show the pan --------------------------------------------
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x + 260, centre.y + 140, { steps: 8 });
  await page.mouse.up();
  const panned = await measure(page);
  say(`after a drag: picture left ${panned.image.left} (was ` +
      `${zoomed.image.left}), highlight still at ` +
      `${JSON.stringify(panned.within)}`);
  await shot(page, "4_panned_at_zoom");

  // --- Escape closes it, and the page is exactly as it was ------------------
  //
  // Waited for on the BODY CLASS, not on the dialog's `open`: `open` is
  // dropped synchronously by Escape while the `close` event that reverses the
  // page's suppressed scroll is a queued task, so a probe that reads the class
  // the instant `open` goes false reads it one task too early. (Measured here
  // first go -- it reported the class still set on a dialog that had shut.)
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => !document.querySelector("#crop-lightbox").open &&
          !document.body.classList.contains("lightbox-open"),
    null, { timeout: 5000 });
  const after = await page.evaluate(() => ({
    bodyClass: document.body.className,
    overflow: getComputedStyle(document.body).overflow,
  }));
  say(`closed: body class ${JSON.stringify(after.bodyClass)}, ` +
      `overflow ${after.overflow}`);

  // --- the hover card's own launcher (the grid's route) ---------------------
  //
  // The grid's inline thumbnail is the one crop image on the page that is not
  // a cropFigure; clicking it opens the edge card, and the card's figure is
  // where the launcher lives. This is that route, on the topology.
  await page.locator('[data-nav-kind="topology"]').first().click();
  const trigger = page.locator("tr.tvrow button.crop-trigger--thumb").first();
  await trigger.waitFor({ timeout: 20000 });
  await trigger.click();
  await page.waitForSelector("#croppop.hovercard--edge", { timeout: 10000 });
  const cardLauncher = page.locator("#croppop button.cropfig__launch").first();
  await cardLauncher.waitFor({ timeout: 10000 });
  await revealLauncher(page, "#croppop");
  say(`the grid thumbnail's hover card carries ` +
      `${await page.locator("#croppop button.cropfig__launch").count()} launcher(s)`);
  await shot(page, "5_hover_card_launcher_from_a_grid_thumbnail");
  await cardLauncher.click();
  await page.waitForSelector("#crop-lightbox[open]", { timeout: 10000 });
  await page.waitForFunction(() => {
    const img = document.querySelector("#crop-lightbox div.cropfig img");
    return img && img.getBoundingClientRect().width > 0;
  }, null, { timeout: 10000 });
  say("a card launch opens the same lightbox");
  await shot(page, "6_lightbox_launched_from_the_hover_card");

  // --- the keyboard route -------------------------------------------------
  //
  // On the PREVIEW PANE's launcher, not the card's, and the reason is worth
  // knowing: Escape is also the page's own dismiss for hover chrome
  // (topology_app.js), so closing the lightbox with Escape closes the card
  // underneath it too -- and `focus()` on a button inside a `display: none`
  // popover does nothing at all. The pane is layout rather than chrome, so it
  // is still there to tab to.
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => !document.querySelector("#crop-lightbox").open &&
          !document.body.classList.contains("lightbox-open"),
    null, { timeout: 5000 });
  await page.locator(
    `[data-nav-kind="topology"][data-nav-id="${TOPOLOGY}"]`).click();
  await page.locator(`tr.tvrow[data-id="${EDGE}"]`).click();
  const paneLauncher = page.locator("#detail button.cropfig__launch");
  await paneLauncher.waitFor({ timeout: 15000 });
  await paneLauncher.focus();
  // Polled, not read once: the button fades in over 120ms (style.css), and
  // getComputedStyle mid-transition returns the frame it is on rather than the
  // value the rule asks for -- which read as `opacity 0` on the first take.
  await page.waitForFunction(() => {
    const button = document.querySelector("#detail button.cropfig__launch");
    return button && Number(getComputedStyle(button).opacity) > 0.9;
  }, null, { timeout: 5000 }).catch(() => {});
  const focusVisible = await page.evaluate(() => {
    const button = document.querySelector("#detail button.cropfig__launch");
    return {
      focused: document.activeElement === button,
      opacity: getComputedStyle(button).opacity,
    };
  });
  say(`focused by keyboard: ${focusVisible.focused}, and visible while ` +
      `focused (opacity ${focusVisible.opacity})`);
  await page.keyboard.press("Enter");
  await page.waitForSelector("#crop-lightbox[open]", { timeout: 10000 });
  say("Enter on the focused launcher opens it too");
} finally {
  await browser.close();
  server.close();
}
