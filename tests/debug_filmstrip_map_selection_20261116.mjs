// A filmstrip scenario for scripts/filmstrip.mjs (the_map_draws_the_end_stop_
// model, 2026-11-16): one selection travelling across all four surfaces with
// the map drawn. The hub's row is hovered in the tree, then clicked; the
// frames show the map's box and pins, the tree's rows, the grid's rows and
// the scene's parts taking the one selection. NOT a tier.
//
//   node scripts/filmstrip.mjs --scenario tests/debug_filmstrip_map_selection_20261116.mjs \
//     --repo C:/workspace/tolstack/data/scratch/map_20261116 --viewport 3840x2160 \
//     --frames 8 --interval 150 --columns 4 --width 3200 \
//     --out docs/sessions/lessons/shots/the_map_draws_the_end_stop_model --name map_selection_four_surfaces
const V2 = "vpa_end_stop_v2";

export default {
  async setup(page, h) {
    await page.addInitScript(() => {
      try { localStorage.setItem("tolstack.viewer.dagDrawing", "map"); } catch (e) { /* no storage */ }
    });
    await page.goto(h.base + "/apps/viewer/topology.html?topology=" + V2, { waitUntil: "load" });
    await page.waitForSelector("#navtree select.navtree__select", { timeout: 30000 });
    await page.selectOption("#navtree select.navtree__select", "topology:" + V2);
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 30000 });
    await page.waitForSelector("#pane-handle:visible", { timeout: 30000 }).catch(() => {});
    if (await page.locator("#pane-handle").isVisible()) {
      await page.locator("#pane-handle").click();
      await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 }).catch(() => {});
      // The scene with its parts in, so the fourth surface can light.
      await page.waitForFunction(() => {
        const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
        return !!(w && w.__scene && w.__scene.listOpenParts().length >= 10);
      }, null, { timeout: 120000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }
    await page.locator('#navtree [data-nav-kind="part"][data-nav-id="hub"]').first().hover({ timeout: 5000 });
    await page.waitForTimeout(400);
  },
  async trigger(page) {
    await page.locator('#navtree [data-nav-kind="part"][data-nav-id="hub"]').first().click({ timeout: 5000, noWaitAfter: true });
  },
  async probe(page) {
    return page.evaluate(() => {
      const count = (sel) => document.querySelectorAll(sel).length;
      const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
      const L = w && w.__lastLight;
      return {
        map: { lead: count("#topopane [class*='--lead']"), selected: count("#topopane [class*='--selected']"),
          touched: count("#topopane [class*='--touched']") },
        tree: { hot: count("#navtree .navtree__row--hot"), on: count("#navtree .navtree__row--on") },
        grid: { lead: count("#topogrid tr.tvrow--lead"), selected: count("#topogrid tr.tvrow--selected") },
        scene: L ? L.layers.map((l) => l.role + ":" + l.tier + ":" + (l.partOverlays || 0) + "p" + (l.faceOverlays || 0) + "f") : null,
      };
    });
  },
};
