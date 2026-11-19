// Hand-run inspection probe for handoff the_pitch_plate_is_an_assembly_with_its_bushings
// (2026-11-18). NOT a tier -- pytest never collects it. It takes the machine's
// browser slot itself.
//
//   node tests/debug_pitch_plate_assembly_20261118.mjs --repo <scratch root> [--shots <dir>] [--questions]
//
// Serves THIS tree's apps/ with data/ from `--repo`, a scratch root whose
// projections were rebuilt from this branch (the main checkout's predate the
// plate's children). At 3840 x 2160, Side by side with the 3D pane open: the
// landing, the pitch plate's district, each new fit and pin hovered, the plate
// assembly selected in the tree -- a shot and a line each -- and a measurement
// of which boxes any connector's route passes through.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
if (!flag("--repo")) throw new Error("--repo <scratch root> is required");
const DATA_REPO = resolve(flag("--repo"));
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/the_pitch_plate_is_an_assembly_with_its_bushings");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const V2 = "vpa_end_stop_v2";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };

const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    const full = join(rel.startsWith("data/") ? DATA_REPO : HERE, rel);
    try {
      const body = readFileSync(full);
      res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream" });
      res.end(body);
    } catch { res.writeHead(404); res.end("not found"); }
  });
  s.listen(0, "127.0.0.1", () => ok(s));
});
const url = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPlaywright();
const browser = await launchBrowser(chromium, { channel: "chrome" });
const log = [];
const say = (line) => { console.log(line); log.push(line); };

const NEW_JOINTS = [
  "pitch_link_flanged_bushing_press_fit", "pitch_link_straight_bushing_transition_fit",
  "pitch_link_flanged_bushing_bore_to_attach_bore", "pitch_link_straight_bushing_bore_to_flanged_bushing_bore",
  "tan_link_flanged_bushing_press_fit", "tan_link_straight_bushing_transition_fit",
  "tan_link_flanged_bushing_bore_to_attach_bore", "tan_link_straight_bushing_bore_to_flanged_bushing_bore",
];

// --questions: the faces behind the question on Jeff's review page -- which
// part each attachment bore sits on -- each option's faces marked on the
// 215177 mesh in the 3D pane, framed, one shot each. Reads and writes nothing.
const PLATE_SHA = "37e9f606341bfd194c2c51ae7517861ecdf1221bd4d262697f4d732b194d5801";
const QUESTION_SHOTS = [
  ["q_pitch_link_b_plate_flanged_bore_1385_1386", [1385, 1386], "pitch"],
  ["q_pitch_link_c_bushing_bore_1509_1510", [1509, 1510], "pitch"],
  ["q_pitch_link_jeffs_bind_straight_bore_1380_1381", [1380, 1381], "pitch"],
  ["q_pitch_link_jeffs_other_bind_1380_1381_1509_1510", [1380, 1381, 1509, 1510], "pitch"],
  ["q_tan_link_b_plate_flanged_bore_1375_1376", [1375, 1376], "tan"],
  ["q_tan_link_c_bushing_bore_1452_1453", [1452, 1453], "tan"],
];
if (argv.includes("--questions")) {
  try {
    for (const [name, faces, joint] of QUESTION_SHOTS) {
      const page = await browser.newPage({ viewport: { width: 3840, height: 2160 } });
      page.on("pageerror", (e) => say(`PAGEERR ${e.message.slice(0, 300)}`));
      await page.addInitScript(() => {
        try { localStorage.setItem("tolstack.viewer.paneView", "both"); } catch (e) { /* none */ }
      });
      await page.goto(`${url}/apps/viewer/topology.html?topology=${V2}`, { waitUntil: "load" });
      await page.waitForSelector("#pane-handle:visible", { timeout: 30000 }).catch(() => {});
      await page.locator("#pane-handle").click();
      const frame = await (async () => {
        for (let i = 0; i < 120; i++) {
          const f = page.frames().find((x) => x.url().includes("/annotate/"));
          if (f && await f.evaluate(() => !!(window.AnnotateApp && window.__scene)).catch(() => false)) return f;
          await page.waitForTimeout(500);
        }
        throw new Error("the 3D pane never booted");
      })();
      await page.waitForTimeout(3000);
      const got = await frame.evaluate(async ([sha, faces, joint]) => {
        const out = {};
        // A pick armed on the attachment's joint end isolates the plate, as a
        // reader's Pick a face does; nothing is written without a click, and
        // this page serves no write route.
        const end = joint === "pitch" ? ["pitch_plate_link_joint", "from"] : ["tan_link_plate_joint", "to"];
        try { await window.AnnotateApp.exec(["arm", end[0], end[1], "vpa_end_stop_v2", "pitch_plate_215177_001"]); out.armed = end[0]; } catch (e) { out.armed = String(e).slice(0, 160); }
        // Wait until the pane stops drawing on its own (the arm's and the
        // sweep's own framing land late), up to a minute.
        for (let k = 0, last = -1, still = 0; k < 120 && still < 6; k++) {
          await new Promise((r) => setTimeout(r, 500));
          const n = window.__scene.renderCount;
          still = n === last ? still + 1 : 0;
          last = n;
        }
        try { await window.AnnotateApp.exec(["camera", "face", sha].concat(faces.map(String))); out.framed = "ok"; } catch (e) { out.framed = String(e).slice(0, 160); }
        for (const f of faces) {
          try { await window.AnnotateApp.exec(["mark-face", sha, String(f)]); } catch (e) { out["mark" + f] = String(e).slice(0, 120); }
        }
        out.tinted = window.__scene.highlightFaces(faces.map((f) => ({ sha256: sha, faceId: f })));
        await new Promise((r) => setTimeout(r, 3000));
        // Framed last and shot at once: the pane re-frames the armed part
        // on its own a moment after any look command.
        out.reframed = window.__scene.frameFaces(sha, faces);
        // The plate alone, opaque, seen from outside it: radially out from
        // the hub's axis and a little above, so blade 1 is not in the way.
        const S = window.__scene;
        S.listOpenParts().forEach((s) => { if (s !== sha) S.setVisible(s, false); });
        S.setGhost(sha, true);
        // In WORLD coordinates: the assembly group carries the CAD-to-scene
        // turn, so the faces' centre and the hub's axis go through matrixWorld.
        const mesh = S.parts.get(sha);
        const nodes = S._occurrenceNodes(sha);
        out.nodes = nodes.map((x) => x.visible);
        // the drawn one: visible all the way up
        const shown = (x) => { for (let q = x; q; q = q.parent) if (!q.visible) return false; return true; };
        const node = nodes.find(shown) || nodes[0];
        out.meshShown = shown(mesh);
        node.updateMatrixWorld(true);
        const pos = mesh.geometry.attributes.position.array;
        let c = [0, 0, 0], n = 0;
        for (const f of faces) {
          const rg = mesh.userData.faceRanges[f];
          for (let i = rg.start; i < rg.start + rg.count; i++) { c[0] += pos[i * 3]; c[1] += pos[i * 3 + 1]; c[2] += pos[i * 3 + 2]; n++; }
        }
        const V = S.camera.position.constructor;
        const centre = new V(c[0] / n, c[1] / n, c[2] / n);
        const axisPt = new V(0, 0, centre.z);
        const up = new V(0, 0, 1);
        const radial = new V(centre.x, centre.y, 0).normalize();
        const world = (v) => v.clone().applyMatrix4(node.matrixWorld);
        const dir = (v) => world(v).sub(world(new V(0, 0, 0))).normalize();
        const w = world(centre), wr = dir(radial), wu = dir(up);
        S.camera.position.copy(w).addScaledVector(wr, 38).addScaledVector(wu, 38);
        S.camera.lookAt(w);
        S.controls.target.copy(w);
        S.controls.update();
        S.requestRender();
        out.target = [w.x, w.y, w.z].map((v) => Math.round(v));
        return out;
      }, [PLATE_SHA, faces, joint]);
      await page.waitForTimeout(300);
      got.atShot = await frame.evaluate(() => {
        const c = window.__scene.camera, g = window.__scene.controls.target;
        return { cam: [c.position.x, c.position.y, c.position.z].map(Math.round), tgt: [g.x, g.y, g.z].map(Math.round),
                 near: c.near, far: c.far, renders: window.__scene.renderCount };
      });
      say(`${name}: ${JSON.stringify(got)}`);
      const pane = await page.evaluate(() => {
        const f = document.querySelector("#annotate-flyout iframe");
        const r = f && f.getBoundingClientRect();
        return r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null;
      });
      await page.screenshot({ path: join(SHOTS, name + ".png"), clip: pane || undefined });
      await page.close();
    }
  } finally {
    writeFileSync(join(SHOTS, "questions_log.txt"), log.join("\n") + "\n", "utf8");
    await browser.close();
    server.close();
  }
  process.exit(0);
}

try {
  const page = await browser.newPage({ viewport: { width: 3840, height: 2160 } });
  page.on("pageerror", (e) => say(`PAGEERR ${e.message.slice(0, 300)}`));
  await page.addInitScript(() => {
    try {
      localStorage.setItem("tolstack.viewer.dagDrawing", "map");
      localStorage.setItem("tolstack.viewer.paneView", "both");
    } catch (e) { /* no storage */ }
  });
  await page.goto(`${url}/apps/viewer/topology.html?topology=${V2}`, { waitUntil: "load" });
  await page.waitForSelector("#navtree select.navtree__select", { timeout: 30000 });
  await page.waitForSelector("#topopane svg.tv__map", { timeout: 30000 });
  await page.waitForSelector("#pane-handle:visible", { timeout: 30000 }).catch(() => {});
  if (await page.locator("#pane-handle").isVisible()) {
    await page.locator("#pane-handle").click();
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(4000);
  }
  const shoot = async (name) => {
    await page.screenshot({ path: join(SHOTS, name + ".png") });
    await page.locator("#topopane").screenshot({ path: join(SHOTS, name + "_map.png") });
    say(`  shot ${name}.png`);
  };

  // What the map drew, and which boxes each connector's route crosses.
  const drawn = await page.evaluate((ids) => {
    const svg = document.querySelector("#topopane svg.tv__map");
    const boxes = Array.from(svg.querySelectorAll("rect.map__box")).map((r) => ({
      id: r.getAttribute("data-map-id"), r: r.getBoundingClientRect() }));
    const crossings = [];
    svg.querySelectorAll("g.map__connector").forEach((g) => {
      const id = g.getAttribute("data-map-id");
      const line = g.querySelector("path.map__connectorline");
      if (!line) return;
      const total = line.getTotalLength();
      const m = line.getScreenCTM();
      const hit = new Set();
      for (let k = 3; k <= 97; k += 1) {
        const p = line.getPointAtLength(total * k / 100);
        const x = m.a * p.x + m.c * p.y + m.e, y = m.b * p.x + m.d * p.y + m.f;
        boxes.forEach((b) => {
          if (x > b.r.left + 2 && x < b.r.right - 2 && y > b.r.top + 2 && y < b.r.bottom - 2) hit.add(b.id);
        });
      }
      if (hit.size) crossings.push(id + " -> " + Array.from(hit).join(", "));
    });
    const present = ids.map((id) => {
      const g = svg.querySelector(`g.map__connector[data-map-id="${id}"]`);
      const sym = g && g.querySelector("[data-symbol]");
      return `${id}: ${g ? "drawn" : "MISSING"}${sym ? " as " + sym.getAttribute("data-symbol") : ""}`;
    });
    const outlines = Array.from(svg.querySelectorAll("[class*='map__assembly']")).map((o) => o.getAttribute("data-map-id"));
    const parts = boxes.map((b) => b.id);
    return { crossings, present, outlines, parts,
      counts: window.ViewerApp.mapCounts(window.ViewerApp.lastMapLight.geometry) };
  }, NEW_JOINTS);
  say("counts " + JSON.stringify(drawn.counts));
  say("boxes " + drawn.parts.join(", "));
  say("assembly outlines " + drawn.outlines.join(", "));
  drawn.present.forEach((l) => say("  " + l));
  say("routes crossing a box (each is the box's own pin or a defect, read the shot): " +
    (drawn.crossings.length ? "\n    " + drawn.crossings.join("\n    ") : "none"));

  await shoot("01_landing_3840_side_by_side");
  // The pitch plate's district alone.
  const district = await page.evaluate(() => {
    const r = document.querySelector('#topopane rect.map__district[data-map-id="pitch_plate"]').getBoundingClientRect();
    return { x: r.left - 40, y: r.top - 40, width: r.width + 80, height: r.height + 80 };
  });
  await page.screenshot({ path: join(SHOTS, "02_pitch_plate_district.png"), clip: district });
  say("  shot 02_pitch_plate_district.png");

  const pointOnLine = (sel) => page.evaluate((s) => {
    const line = document.querySelector(s);
    const p = line.getPointAtLength(line.getTotalLength() * 0.25);
    const m = line.getScreenCTM();
    return [m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f];
  }, sel);
  let step = 2;
  for (const id of NEW_JOINTS) {
    step += 1;
    const sel = `#topopane g.map__connector[data-map-id="${id}"] path.map__connectorline`;
    try {
      const [x, y] = await pointOnLine(sel);
      await page.mouse.move(x, y);
      await page.waitForTimeout(500);
      const lit = await page.evaluate(() => {
        const on = (s) => document.querySelectorAll(s).length;
        const tip = document.querySelector(".map__tooltip, [role=tooltip]");
        return `map hot ${on("#topopane [class*='--hot']")}, tree hot ${on("#navtree .navtree__row--hot")}, grid lead ${on("#topogrid tr.tvrow--lead")}` +
          (tip ? `, tip "${tip.textContent.slice(0, 120)}"` : "");
      });
      say(`${step}. hover ${id}: ${lit}`);
      await page.screenshot({ path: join(SHOTS, `${String(step).padStart(2, "0")}_hover_${id}.png`), clip: district });
    } catch (e) {
      say(`${step}. hover ${id}: THREW ${e.message.slice(0, 200)}`);
    }
  }
  await page.mouse.move(5, 5);

  step += 1;
  // Clicked in the page: with the 3D pane loading, Playwright's own click
  // times out waiting on the page after the press.
  await page.evaluate(() => document.querySelector(
    '#navtree [data-nav-kind="part"][data-nav-id="pitch_plate_215177_001"]').click());
  await page.waitForTimeout(5000);
  const selected = await page.evaluate(() => {
    const on = (s) => document.querySelectorAll(s).length;
    const preview = document.querySelector(".detail__previewbody") || document.querySelector("#detail");
    const tree = Array.from(document.querySelectorAll("#navtree [data-nav-kind='part']"))
      .map((r) => r.getAttribute("data-nav-id") + " (" + (r.textContent || "").trim().slice(0, 60) + ")");
    return { lit: `map selected ${on("#topopane [class*='--selected']")}, tree on ${on("#navtree .navtree__row--on")}`,
      preview: preview ? preview.textContent.replace(/\s+/g, " ").slice(0, 400) : null, tree };
  });
  say(`${step}. select the pitch plate assembly in the tree: ${selected.lit}`);
  say("   preview: " + selected.preview);
  say("   tree parts: " + selected.tree.filter((t) => /pitch_plate|bushing/.test(t)).join(" | "));
  await shoot(`${String(step).padStart(2, "0")}_pitch_plate_selected`);
  const pane = await page.evaluate(() => {
    const f = document.querySelector("#annotate-flyout iframe");
    return f ? f.getBoundingClientRect() : null;
  });
  if (pane) {
    await page.screenshot({ path: join(SHOTS, `${String(step).padStart(2, "0")}_pitch_plate_selected_pane.png`),
      clip: { x: pane.left, y: pane.top, width: pane.width, height: pane.height } });
  }
  await page.close();
} finally {
  writeFileSync(join(SHOTS, "probe_log.txt"), log.join("\n") + "\n", "utf8");
  await browser.close();
  server.close();
}
