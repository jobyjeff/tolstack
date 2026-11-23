// Score a map arrangement the way the page lays it out -- run by hand, never
// by pytest (tests/debug_*). Handoff the_lug_stacks_line_up_and_each_link_is_
// a_row_on_the_map (2026-11-22): two sessions before it scored arrangements
// with scratch scripts that left the repo with them, so the next arrangement
// started from nothing. This one stays.
//
// It loads the viewer's own vocabulary and apps/viewer/map.js into a node vm
// and runs VA.mapLayout on a model from a built topologies.json, with the
// places from a layout file (default: the model's authored one) -- so every
// count below is the page's own geometry, and the notes are VA.mapRouteNotes'.
//
//   node tests/debug_map_arrangement.mjs
//   node tests/debug_map_arrangement.mjs --layout <map_*.json> --model vpa_end_stop_v2
//   node tests/debug_map_arrangement.mjs --topologies <topologies.json> --code <apps/viewer dir>
//   node tests/debug_map_arrangement.mjs --json      (one line, for a search loop)
//
// --code points at another tree's apps/viewer (a `git archive` export) to
// score an older layout with its own code; the counts it prints are this
// script's, so a before and an after are counted the same way.
//
// Prints: the notes; the grid of places; routes, crossings (pairs, jumpers
// aside), diagonal routes (any leg off 0/90 degrees), the drawing's bounds in
// world units and in cells; and, per body, the closest two parallel route
// legs come (the plate district's "routes no closer than the map's spacing").
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");

function arg(name, dflt) {
  const i = process.argv.indexOf("--" + name);
  return i === -1 ? dflt : process.argv[i + 1];
}
const flag = (name) => process.argv.includes("--" + name);

const code = arg("code", path.join(repo, "apps", "viewer"));
const topologies = arg("topologies", "C:/workspace/tolstack/data/projections/viewer/topologies.json");
const modelId = arg("model", "vpa_end_stop_v2");
const layoutPath = arg("layout", null);

export function loadMap(codeDir) {
  const sandbox = { window: {}, console };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  for (const f of ["vocab.gen.js", "map.js"]) {
    vm.runInContext(fs.readFileSync(path.join(codeDir, f), "utf8").replace(/^\uFEFF/, ""),
      sandbox, { filename: f });
  }
  return sandbox.window.ViewerApp;
}

function segmentsOf(c) {
  const out = [];
  for (let i = 1; i < c.points.length; i++) out.push([c.points[i - 1], c.points[i]]);
  return out;
}

function diagonal(seg) {
  const dx = Math.abs(seg[1].x - seg[0].x), dy = Math.abs(seg[1].y - seg[0].y);
  return dx > 0.5 && dy > 0.5;
}

// The closest two parallel, overlapping legs of two different routes come
// inside one rectangle (a district): the spacing a reader sees.
function closestParallel(connectors, rect) {
  let best = Infinity, pair = null;
  const inR = (p) => p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h;
  const legs = [];
  connectors.forEach((c) => segmentsOf(c).forEach((s) => {
    if (inR(s[0]) && inR(s[1]) && Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y) > 1) legs.push({ c: c.id, s });
  }));
  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      if (legs[i].c === legs[j].c) continue;
      const [p, q] = legs[i].s, [r, s] = legs[j].s;
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      const ux = (q.x - p.x) / len, uy = (q.y - p.y) / len;
      const len2 = Math.hypot(s.x - r.x, s.y - r.y);
      const vx = (s.x - r.x) / len2, vy = (s.y - r.y) / len2;
      if (Math.abs(ux * vy - uy * vx) > 1e-3) continue;
      const t1 = (r.x - p.x) * ux + (r.y - p.y) * uy, t2 = (s.x - p.x) * ux + (s.y - p.y) * uy;
      const overlap = Math.min(len, Math.max(t1, t2)) - Math.max(0, Math.min(t1, t2));
      if (overlap < 1) continue;
      const d = Math.abs((r.x - p.x) * uy - (r.y - p.y) * ux);
      if (d < best) { best = d; pair = [legs[i].c, legs[j].c]; }
    }
  }
  return { gap: best, pair };
}

export function score(VA, model, places) {
  const geo = VA.mapLayout(model, { places });
  const routes = geo.connectors.length;
  let crossings = 0;
  const crossed = [];
  for (let i = 0; i < geo.connectors.length; i++) {
    for (let j = i + 1; j < geo.connectors.length; j++) {
      if (VA.mapRoutesCross
        ? VA.mapRoutesCross(geo.connectors[i].points, geo.connectors[j].points)
        : false) { crossings += 1; crossed.push(geo.connectors[i].id + " x " + geo.connectors[j].id); }
    }
  }
  const diagonals = geo.connectors.filter((c) => segmentsOf(c).some(diagonal)).map((c) => c.id);
  const M = geo.metrics;
  const b = geo.bounds;
  const spacing = {};
  geo.bodies.forEach((body) => { spacing[body.id] = closestParallel(geo.connectors, body); });
  const length = geo.connectors.reduce((s, c) => s + segmentsOf(c).reduce((t, g) =>
    t + Math.hypot(g[1].x - g[0].x, g[1].y - g[0].y), 0), 0);
  return {
    geo, notes: geo.notes, routes, crossings, crossed, diagonals,
    bounds: { w: Math.round(b.w), h: Math.round(b.h), area: Math.round(b.w * b.h),
              cells: [+(b.w / M.cell.w).toFixed(2), +(b.h / M.cell.h).toFixed(2)] },
    length: Math.round(length), spacing,
  };
}

function grid(VA, places, model) {
  const cols = Math.max(...Object.values(places).map((p) => p[0])) + 1;
  const rows = Math.max(...Object.values(places).map((p) => p[1])) + 1;
  const out = [];
  for (let r = 0; r < rows; r++) {
    const line = [];
    for (let c = 0; c < cols; c++) {
      const here = Object.keys(places).filter((id) => places[id][0] === c && places[id][1] === r &&
        !(VA.mapOutlined(model.parts.find((p) => p.id === id))));
      line.push((here.map((id) => id.length > 14 ? id.slice(0, 14) : id).join("+") || ".").padEnd(16));
    }
    out.push(line.join(""));
  }
  return out.join("\n");
}

// The model `id` of a built topologies.json.
export function loadModel(file, id) {
  const proj = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  const rows = Array.isArray(proj.topologies) ? proj.topologies : Object.values(proj.topologies);
  const t = rows.find((r) => r.id === id);
  if (!t) throw new Error("no model " + id + " in " + file);
  return t;
}

function main() {
const VA = loadMap(code);
const t = loadModel(topologies, modelId);
const doc = layoutPath ? JSON.parse(fs.readFileSync(layoutPath, "utf8").replace(/^\uFEFF/, "")) : t.map;
const s = score(VA, t.model, doc.places);
if (flag("json")) {
  console.log(JSON.stringify({ notes: s.notes.length, routes: s.routes, crossings: s.crossings,
    diagonals: s.diagonals.length, bounds: s.bounds, length: s.length }));
} else {
  console.log(grid(VA, doc.places, t.model));
  console.log("");
  console.log("notes (" + s.notes.length + "):");
  s.notes.forEach((n) => console.log("  " + n));
  console.log("routes " + s.routes + ", crossings " + s.crossings +
    (s.crossed.length ? " (" + s.crossed.join("; ") + ")" : ""));
  console.log("diagonal routes " + s.diagonals.length + ": " + s.diagonals.join(", "));
  console.log("bounds " + s.bounds.w + " x " + s.bounds.h + " = " + s.bounds.cells.join(" x ") +
    " cells, area " + s.bounds.area + "; route length " + s.length);
  Object.keys(s.spacing).forEach((id) => {
    const g = s.spacing[id];
    console.log("closest parallel legs in " + id + ": " +
      (isFinite(g.gap) ? Math.round(g.gap) + " (" + g.pair.join(", ") + ")" : "none"));
  });
}
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
