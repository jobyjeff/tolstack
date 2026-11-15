// Hand-run walk driver for handoff the_walk_reads_the_merged_page_against_
// jeffs_november_notes (2026-11-14). NOT a tier -- pytest never collects it.
// It takes the machine's browser slot itself and holds it until /__ctl/quit.
//
// drawing-checker's mounts reproduced on a fixed private port, the same shape
// as tests/debug_binding_corrected_where_shown_20261112.mjs: /tolstack/viewer/
// and /tolstack/annotate/ from THIS tree, /tolstack/data/meshes/ and
// /tolstack/data/ from a SCRATCH root (`<root>/data/...`, built by the seven
// builders with --data-root). The pane's folder grant is its real File System
// Access path handed a directory handle this server backs with <root>, so a
// bind, a correction and an unbind land in <root>/data/inbox/feature-identity
// -- never in the main checkout's log. Every other GET path is proxied to
// drawing-checker on 8000, read-only, so a part's drawing link resolves as it
// would there.
//
// The page is driven one step at a time over HTTP, so a person-like walk can
// look at each shot before deciding the next move:
//
//   node tests/debug_walk_merged_page_20261114.mjs --root <scratch root>
//        [--port 8871] [--width 3840] [--height 2160] [--shots <dir>]
//   curl -s localhost:8871/__ctl -d '{"op":"goto","query":"topology=vpa_end_stop_v2"}'
//   ops: goto{query} | viewport{w,h} | eval{js,frame?} | shot{name,sel?,clip?,frame?}
//        mouse{action:move|click|down|up|wheel|dbl,x,y,button?,dx?,dy?}
//        click{sel,frame?} | hover{sel,frame?} | key{key} | errors | quit
//   (frame: "pane" addresses the embedded annotate iframe; its coordinates
//    are the iframe's own)
import { createServer, request as httpRequest } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, extname, resolve, dirname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const ROOT = resolve(flag("--root") || "C:/workspace/tolstack/data/scratch/walk1114");
const PORT = Number(flag("--port") || 8871);
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/the_merged_page_20261112");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const DATA = join(ROOT, "data");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const MOUNTS = [
  ["/tolstack/viewer/", join(HERE, "apps", "viewer")],
  ["/tolstack/annotate/", join(HERE, "apps", "annotate")],
  ["/tolstack/data/meshes/", join(DATA, "meshes")],
  ["/tolstack/data/", join(DATA, "projections", "viewer")],
];
// The "repo root" the fake folder grant sees: writes land only under <root>/data.
function folderPath(rel) {
  const r = rel.replace(/^\/+/, "");
  if (r.startsWith("data/inbox/feature-identity") || r.startsWith("data/projections")) {
    return { full: join(ROOT, r), write: true };
  }
  if (r.startsWith("data/")) return { full: join(ROOT, r), write: false };
  return { full: join(HERE, r), write: false };
}

let page = null;
let browser = null;
const errors = [];
const json = (res, code, body) => res.writeHead(code, { "content-type": "application/json" })
  .end(JSON.stringify(body, null, 1));
const target = (frame) => (frame === "pane"
  ? page.frames().find((f) => f.url().includes("/annotate/")) : page);

async function control(cmd) {
  const t = target(cmd.frame);
  if (!t) return { error: "no such frame" };
  switch (cmd.op) {
    case "goto":
      await page.goto(`http://127.0.0.1:${PORT}/tolstack/viewer/topology.html${cmd.query ? "?" + cmd.query : ""}`,
        { waitUntil: "load" });
      await page.waitForTimeout(cmd.wait || 4000);
      return { url: page.url() };
    case "viewport":
      await page.setViewportSize({ width: cmd.w, height: cmd.h });
      await page.waitForTimeout(1000);
      return { ok: true };
    case "eval": {
      // eslint-disable-next-line no-new-func
      const value = await t.evaluate(cmd.js);
      return { value };
    }
    case "shot": {
      const file = join(SHOTS, cmd.name + ".png");
      if (cmd.wait) await page.waitForTimeout(cmd.wait);
      if (cmd.sel) await t.locator(cmd.sel).first().screenshot({ path: file, timeout: 120000 });
      else await page.screenshot({ path: file, clip: cmd.clip, timeout: 120000 });
      return { file };
    }
    case "mouse": {
      const m = page.mouse;
      if (cmd.action === "move") await m.move(cmd.x, cmd.y, { steps: cmd.steps || 5 });
      else if (cmd.action === "click") await m.click(cmd.x, cmd.y, { button: cmd.button || "left" });
      else if (cmd.action === "dbl") await m.dblclick(cmd.x, cmd.y, { button: cmd.button || "left" });
      else if (cmd.action === "down") { await m.move(cmd.x, cmd.y); await m.down({ button: cmd.button || "left" }); }
      else if (cmd.action === "up") { await m.move(cmd.x, cmd.y, { steps: cmd.steps || 10 }); await m.up({ button: cmd.button || "left" }); }
      else if (cmd.action === "wheel") { await m.move(cmd.x, cmd.y); await m.wheel(cmd.dx || 0, cmd.dy || 0); }
      await page.waitForTimeout(cmd.wait || 600);
      return { ok: true };
    }
    case "click":
      await t.locator(cmd.sel).first().click({ timeout: 15000, button: cmd.button || "left" });
      await page.waitForTimeout(cmd.wait || 800);
      return { ok: true };
    case "hover":
      await t.locator(cmd.sel).first().hover({ timeout: 15000 });
      await page.waitForTimeout(cmd.wait || 800);
      return { ok: true };
    case "key":
      await page.keyboard.press(cmd.key);
      await page.waitForTimeout(cmd.wait || 500);
      return { ok: true };
    case "errors":
      return { errors: errors.splice(0) };
    case "quit":
      setTimeout(async () => { await browser.close(); process.exit(0); }, 100);
      return { bye: true };
    default:
      return { error: "unknown op " + cmd.op };
  }
}

function proxyToDrawingChecker(req, res) {
  const up = httpRequest({ host: "127.0.0.1", port: 8000, path: req.url, method: "GET",
    headers: { accept: req.headers.accept || "*/*" } }, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  up.on("error", () => res.writeHead(502).end("drawing-checker unreachable"));
  up.end();
}

const server = createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  try {
    if (u.pathname === "/__ctl") {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      let cmd;
      try { cmd = JSON.parse(Buffer.concat(chunks).toString("utf-8")); } catch { return json(res, 400, { error: "bad json" }); }
      try { return json(res, 200, await control(cmd)); } catch (e) { return json(res, 500, { error: String(e.message || e).slice(0, 800) }); }
    }
    if (u.pathname.startsWith("/fs/")) {
      const tgt = folderPath(u.searchParams.get("p") || "");
      const verb = u.pathname.slice(4);
      if (verb === "stat") {
        const kind = existsSync(tgt.full) ? (statSync(tgt.full).isDirectory() ? "directory" : "file") : null;
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ kind }));
      } else if (verb === "list") {
        const out = readdirSync(tgt.full).map((name) => ({ name,
          kind: statSync(join(tgt.full, name)).isDirectory() ? "directory" : "file" }));
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(out));
      } else if (verb === "read") {
        res.writeHead(200).end(readFileSync(tgt.full));
      } else if ((verb === "write" || verb === "mkdir") && tgt.write) {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        if (verb === "mkdir") mkdirSync(tgt.full, { recursive: true });
        else { mkdirSync(dirname(tgt.full), { recursive: true }); writeFileSync(tgt.full, Buffer.concat(chunks)); }
        res.writeHead(200).end("ok");
      } else {
        res.writeHead(403).end("read-only");
      }
      return;
    }
    const path = decodeURIComponent(u.pathname);
    const mount = MOUNTS.find(([prefix]) => path.startsWith(prefix));
    if (!mount) return proxyToDrawingChecker(req, res);
    const full = join(mount[1], normalize(path.slice(mount[0].length)));
    if (!full.startsWith(mount[1] + sep) && full !== mount[1]) throw new Error("outside");
    const body = readFileSync(statSync(full).isDirectory() ? join(full, "index.html") : full);
    res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream",
      "cache-control": "no-cache" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

// The pane's showDirectoryPicker, backed by /fs/ (installed in every frame).
const FAKE_PICKER = () => {
  if (!location.pathname.includes("/annotate/")) return;
  const enc = encodeURIComponent;
  const notFound = () => new DOMException("not found", "NotFoundError");
  const stat = async (p) => (await (await fetch("/fs/stat?p=" + enc(p))).json()).kind;
  const join = (a, b) => (a ? a + "/" + b : b);
  const fileHandle = (p) => ({
    kind: "file", name: p.split("/").pop(),
    async getFile() {
      const buf = await (await fetch("/fs/read?p=" + enc(p))).arrayBuffer();
      return { text: async () => new TextDecoder().decode(buf), arrayBuffer: async () => buf };
    },
    async createWritable() {
      const parts = [];
      return { write: async (d) => { parts.push(d); },
        close: async () => { await fetch("/fs/write?p=" + enc(p), { method: "PUT", body: parts.join("") }); } };
    },
  });
  const dirHandle = (p) => ({
    kind: "directory", name: p.split("/").pop() || "tolstack",
    async getDirectoryHandle(name, opts) {
      const q = join(p, name);
      const kind = await stat(q);
      if (kind === "directory") return dirHandle(q);
      if (!kind && opts && opts.create) { await fetch("/fs/mkdir?p=" + enc(q), { method: "POST" }); return dirHandle(q); }
      throw notFound();
    },
    async getFileHandle(name, opts) {
      const q = join(p, name);
      const kind = await stat(q);
      if (kind === "file") return fileHandle(q);
      if (!kind && opts && opts.create) return fileHandle(q);
      throw notFound();
    },
    async *entries() {
      const list = await (await fetch("/fs/list?p=" + enc(p))).json();
      for (const e of list) yield [e.name, e.kind === "directory" ? dirHandle(join(p, e.name)) : fileHandle(join(p, e.name))];
    },
    async queryPermission() { return "granted"; },
    async requestPermission() { return "granted"; },
  });
  window.showDirectoryPicker = async () => dirHandle("");
};

await new Promise((ok) => server.listen(PORT, "127.0.0.1", ok));
const { chromium } = await loadPlaywright();
browser = await launchBrowser(chromium, { channel: "chrome" });
page = await browser.newPage({ viewport: { width: Number(flag("--width") || 3840),
  height: Number(flag("--height") || 2160) } });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 300)); });
await page.addInitScript(FAKE_PICKER);
console.log(JSON.stringify({ ready: `http://127.0.0.1:${PORT}`, root: ROOT, shots: SHOTS }));
