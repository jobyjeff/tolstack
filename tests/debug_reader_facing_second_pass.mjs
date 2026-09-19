// Hand-run inspection probe for handoff reader_facing_surfaces_second_pass
// (2026-09-18). NOT a tier -- pytest never collects it and no runner calls it.
// Its job is the six before/after measurements the handoff's definition of done
// asks for, and it is committed for the reason every previous session's probe
// was: a measurement nobody can re-take is a measurement nobody can check.
//
//   node tests/debug_reader_facing_second_pass.mjs --repo C:/workspace/tolstack
//   node tests/debug_reader_facing_second_pass.mjs --repo C:/workspace/tolstack \
//        --shots docs/sessions/lessons --phase before
//
// `--repo` is the worktree escape hatch every real-data probe in this repo
// takes: data/ is gitignored and lives only in the main checkout, so the static
// server below serves /data/... from there while every app file comes from THIS
// tree. Without --shots it only prints what it measured.
//
// `--phase before|after`, the shape tests/debug_typography_pass.mjs established:
// five of the six deliverables are judgements about layout, density and voice,
// so the only honest evidence is the same page shot twice off two trees. Run it
// with `--phase before` on the baseline commit, make the change, run it again
// with `--phase after`, and the pair lands beside each other under identical
// clips.
//
// EVERY SHOT HERE IS LIVE except the annotator's, and that is not a choice: the
// annotator needs a File System Access grant to read anything real, and FSA
// needs a user gesture no automated browser can supply, so it runs ?mock=1. The
// viewport is 1600x1000 for the viewer -- the size the handoff states its
// measurements at, and the size the 750px materials row was measured at.
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
const PHASE = flag("--phase") || "after";
if (!["before", "after"].includes(PHASE)) {
  console.error(`--phase must be "before" or "after", not ${JSON.stringify(PHASE)}`);
  process.exit(2);
}

const PREFIX = "LESSONS_20260918_reader_facing_surfaces_second_pass";
const STACK = "hub_bearing_thermal_fit_m1";
const TOPOLOGY_STUDY = "pitch_system_blade_angle_average";
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

const notes = [];
const say = (line) => { notes.push(line); console.log(line); };

async function shot(page, name, opts) {
  if (!SHOTS) return;
  const file = join(SHOTS, `${PREFIX}_${name}_${PHASE}.png`);
  await page.screenshot({ path: file, ...(opts || {}) });
  console.log(`    wrote ${file}`);
}

// An ELEMENT screenshot, not a clipped page screenshot. The materials table is
// taller than the 1600x1000 viewport this probe measures at (three rows at
// ~600px each), and a clip rectangle can only ever address what is inside the
// resulting image -- playwright fails outright rather than scrolling for you.
// `locator.screenshot()` scrolls the element in and captures all of it, which
// is the whole point of shooting this particular surface.
async function shotOf(page, name, selector) {
  if (!SHOTS) return;
  const file = join(SHOTS, `${PREFIX}_${name}_${PHASE}.png`);
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  await target.screenshot({ path: file });
  console.log(`    wrote ${file}`);
}

async function parkPointer(page) {
  await page.keyboard.press("Escape");
  await page.mouse.move(2, 2);
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  });
}

const server = await startServer();
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: "chrome" });

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => say(`  PAGE ERROR: ${e}`));
  await page.goto(`${url}/apps/viewer/topology.html`, { waitUntil: "load" });
  await page.waitForSelector('[data-nav-kind="study"]', { timeout: 20000 });

  // --- deliverable 1: the materials row's measured height ------------------
  await page.locator(`[data-nav-kind="stack"][data-nav-id="${STACK}"]`).click();
  await page.waitForSelector("#stackview tr.mat-row", { timeout: 20000 });
  await parkPointer(page);
  const paneWidth = await page.evaluate(() => {
    const d = document.querySelector("#detail");
    return d ? Math.round(d.getBoundingClientRect().width) : null;
  });
  const matRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("#stackview tr.mat-row")).map((tr) => ({
      id: (tr.querySelector("code") || {}).textContent || "",
      height: Math.round(tr.getBoundingClientRect().height),
      cells: Array.from(tr.children).map((td) => ({
        cls: td.className,
        height: Math.round(td.getBoundingClientRect().height),
      })),
    }));
  });
  const elRows = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#stackview tr.el-row"))
      .map((tr) => Math.round(tr.getBoundingClientRect().height)));
  say(`preview pane width: ${paneWidth}px (its default)`);
  matRows.forEach((r) => {
    say(`materials row ${r.id}: ${r.height}px  [` +
        r.cells.map((c) => `${c.cls || "td"} ${c.height}`).join(" | ") + `]`);
  });
  say(`elements table data rows for comparison: ` +
      `${Math.min(...elRows)}-${Math.max(...elRows)}px over ${elRows.length} rows`);
  await shotOf(page, "1_materials_table", "#stackview .mattable");

  // ...and what a selected material shows, which is the other half of the
  // elements table's answer: the detail lives in the pane, not in the cell.
  await page.locator("#stackview tr.mat-row").first().click();
  await page.waitForTimeout(150);
  await parkPointer(page);
  const matPane = await page.evaluate(() => {
    const d = document.querySelector("#detail");
    return d ? d.textContent.replace(/\s+/g, " ").trim().slice(0, 400) : null;
  });
  say(`pane after clicking the first materials row: ${JSON.stringify(matPane)}`);
  await shotOf(page, "2_material_pane", "#detail");

  // --- deliverable 6: the joint block's headline ---------------------------
  const joint = await page.evaluate(() => {
    const box = document.querySelector("#stackview details.sv__joint");
    if (!box) return null;
    box.open = true;
    const ex = box.querySelector(".el-export");
    return {
      classes: ex ? ex.className : null,
      headline: ex ? (ex.querySelector(".el-export__head") || {}).textContent : null,
      why: ex ? (ex.querySelector(".el-export__why") || {}).textContent : null,
    };
  });
  say(`joint export block: class=${JSON.stringify(joint && joint.classes)}`);
  say(`joint export headline: ${JSON.stringify(joint && joint.headline)}`);
  await shotOf(page, "3_joint_block", "#stackview details.sv__joint");

  // --- deliverable 5a: the stack preview pane's crop head ------------------
  const cropElement = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("#stackview tr.el-row"));
    for (const tr of rows) {
      const trig = tr.querySelector(".crop-trigger--resolved");
      if (trig) return rows.indexOf(tr);
    }
    return -1;
  });
  if (cropElement >= 0) {
    await page.locator("#stackview tr.el-row").nth(cropElement).click();
    await page.waitForSelector("#detail .detail__crop-img, #detail .detail__crop",
      { timeout: 10000 });
    await page.waitForTimeout(250);
    await parkPointer(page);
    const stackPane = await page.evaluate(() => ({
      where: (document.querySelector("#detail .detail__where") || {}).textContent,
      head: (document.querySelector("#detail .detail__crop-head") || {}).textContent || null,
    }));
    say(`stack pane where-line: ${JSON.stringify(stackPane.where)}`);
    say(`stack pane crop head:  ${JSON.stringify(stackPane.head)}`);
    await shotOf(page, "4_stack_preview_pane", "#detail");
  } else {
    say("stack pane: no element on this stack has a resolved crop");
  }

  // --- deliverable 2: the worksheet renderer -------------------------------
  await page.locator("#worksheet-toggle").click();
  await page.waitForSelector("#worksheet-dialog[open]", { timeout: 10000 });
  await page.waitForFunction(() => {
    const body = document.querySelector("#worksheet .worksheet__body");
    return !!(body && body.textContent.trim());
  }, null, { timeout: 15000 });
  await page.mouse.move(2, 2);
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  });
  const ws = await page.evaluate(() => {
    const body = document.querySelector("#worksheet .worksheet__body");
    if (!body) return null;
    const counts = {};
    for (const el of body.querySelectorAll("*")) {
      counts[el.tagName] = (counts[el.tagName] || 0) + 1;
    }
    const text = body.textContent;
    return {
      counts,
      strayBold: (text.match(/\*\*/g) || []).length,
      softBreaks: body.querySelectorAll("p br").length,
      firstParagraphs: Array.from(body.querySelectorAll("p")).slice(0, 3)
        .map((p) => p.textContent.replace(/\s+/g, " ").trim().slice(0, 160)),
    };
  });
  say(`worksheet blocks: ` + Object.entries(ws.counts)
      .sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}:${n}`).join("  "));
  say(`worksheet stray "**" runs in rendered text: ${ws.strayBold}`);
  say(`worksheet soft breaks inside paragraphs: ${ws.softBreaks}`);
  ws.firstParagraphs.forEach((p, i) => say(`  worksheet P${i + 1}: ${JSON.stringify(p)}`));
  await shot(page, "5_worksheet_dialog");
  await page.keyboard.press("Escape");

  // --- deliverable 5b: the DAG preview pane's crop head --------------------
  await page.locator(`[data-nav-kind="study"][data-nav-id="${TOPOLOGY_STUDY}"]`).click();
  await page.waitForSelector("tr.tvrow", { timeout: 20000 });
  const dagRow = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("tr.tvrow"));
    return rows.findIndex((tr) => /214820/.test(tr.textContent));
  });
  const pick = dagRow >= 0 ? dagRow : 0;
  await page.locator("tr.tvrow").nth(pick).click();
  await page.waitForSelector("#detail .detail__head", { timeout: 10000 });
  await page.waitForTimeout(350);
  await parkPointer(page);
  const dagPane = await page.evaluate(() => ({
    wheres: Array.from(document.querySelectorAll("#detail .detail__where"))
      .map((d) => d.textContent),
    head: (document.querySelector("#detail .detail__crop-head") || {}).textContent || null,
  }));
  dagPane.wheres.forEach((w, i) => say(`DAG pane where-line ${i + 1}: ${JSON.stringify(w)}`));
  say(`DAG pane crop head:  ${JSON.stringify(dagPane.head)}`);
  await shotOf(page, "6_dag_preview_pane", "#detail");
  await page.close();

  // --- deliverable 4: the annotator's two always-visible surfaces ----------
  const an = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  an.on("pageerror", (e) => say(`  ANNOTATE PAGE ERROR: ${e}`));
  await an.goto(`${url}/apps/annotate/index.html?mock=1`, { waitUntil: "load" });
  await an.waitForSelector("#element-list li.el-row", { timeout: 20000 });
  await an.mouse.move(2, 2);
  const annotate = await an.evaluate(() => {
    const cmd = document.querySelector("#command");
    const labels = Array.from(document.querySelectorAll(".an__panel-label, .an__label, label"))
      .map((n) => n.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
    return {
      placeholder: cmd ? cmd.getAttribute("placeholder") : null,
      commandTitle: cmd ? cmd.getAttribute("title") : null,
      labels,
      pageText: document.body.textContent.replace(/\s+/g, " ").trim(),
    };
  });
  say(`annotator command placeholder: ${JSON.stringify(annotate.placeholder)}`);
  say(`annotator labels: ${JSON.stringify(annotate.labels)}`);
  ["data/meshes/", "window.AnnotateApp", "machined_213668", "isolate "].forEach((needle) => {
    say(`annotator page text contains ${JSON.stringify(needle)}: ` +
        (annotate.pageText.indexOf(needle) !== -1));
  });
  await shot(an, "7_annotator_page");
  await an.close();
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
  console.log(`\n--- what this probe measured (phase: ${PHASE}) ---`);
  notes.forEach((line) => console.log("  " + line));
}
