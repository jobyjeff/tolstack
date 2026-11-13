// A filmstrip scenario (scripts/filmstrip.mjs --scenario <this file>) for
// handoff hover_and_select_light_the_same_things_on_all_four_surfaces_and_
// nothing_goes_opaque (2026-11-12): the hub hovered in the tree, then
// clicked -- the hover-to-select transition on all four surfaces. NOT a
// tier; run by hand:
//
//   node scripts/filmstrip.mjs --scenario tests/debug_light_filmstrip_scenario_20261112.mjs
//        --repo <data root> --out docs/sessions/lessons/shots/<slug> --name hover_to_select
//        --frames 8 --interval 150 --viewport 2400x1500
//
// Setup opens the end-stop model's page on the real projection, opens the 3D
// pane, loads the newest sweep from the Studies row and rests the pointer on
// the hub's row; the trigger clicks it. The probe samples, per frame, what
// each surface shows lit, selected and -- in the scene -- the pane's light
// layers and every drawn part's opacity.
const V2 = "vpa_end_stop_v2";
const HUB = "hub";

export default {
  async setup(page, h) {
    await page.goto(`${h.base}/apps/viewer/topology.html?topology=${V2}`, { waitUntil: "load" });
    await page.waitForSelector("svg.tv__rails", { timeout: 30000 });
    await h.settled(page, 800);
    await page.locator("#pane-handle").click({ timeout: 15000 });
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
    await page.waitForFunction(() => {
      const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
      return w && w.AnnotateApp && w.__embedTree;
    }, null, { timeout: 120000 }).catch(() => {});
    await page.locator(`#navtree [data-nav-kind="kinematic-model"][data-nav-id="${V2}"]`).first()
      .click({ timeout: 10000 }).catch(() => {});
    await page.waitForFunction(() => {
      const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
      return w && w.__sweep && w.__sweep.bodies && w.__sweep.bodies.length;
    }, null, { timeout: 180000 }).catch(() => {});
    await page.evaluate(() => {
      const w = document.querySelector("#annotate-flyout iframe").contentWindow;
      return w.AnnotateApp.exec(["pause"]);
    }).catch(() => {});
    await page.waitForTimeout(4000);
    if (!(await page.locator(`#navtree ${h.navRow("feature", HUB + "@hub_spindle_bore_axis")}`).count())) {
      await page.locator('#navtree [data-nav-twisty="p:hub"]').first().click({ timeout: 5000 }).catch(() => {});
    }
    const row = page.locator(`#navtree ${h.navRow("part", HUB)}`).first();
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover({ timeout: 5000 });
    await page.waitForTimeout(1200);
  },
  async trigger(page, h) {
    await h.click(page, `#navtree ${h.navRow("part", HUB)}`);
  },
  probe: (page) => page.evaluate(() => {
    const q = (sel) => Array.from(document.querySelectorAll(sel));
    const ids = (nodes, attr) => Array.from(new Set(nodes.map((n) => n.getAttribute(attr)))).sort();
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    const view = w && w.AnnotateApp ? w.AnnotateApp.exec(["scene-view"]).filter((r) => r.visible) : [];
    return {
      treeHot: ids(q("#navtree .navtree__row--hot"), "data-nav-id").length,
      treeOn: ids(q("#navtree .navtree__row--on"), "data-nav-id").length,
      treeOnTouching: ids(q("#navtree .navtree__row--on-touching"), "data-nav-id").length,
      gridLead: ids(q("#topopane tr.tvrow--lead"), "data-id"),
      gridSelected: ids(q("#topopane tr.tvrow--selected"), "data-id"),
      dotsLead: q("svg.tv__rails circle.rail__dot--lead").length,
      dotsSelected: q("svg.tv__rails circle.rail__dot--selected").length,
      containerSelected: q("svg.tv__rails .tv__block--selected, svg.tv__rails .tv__partfield--selected").length,
      light: w && w.__lastLight ? w.__lastLight.layers.map((l) => l.role + "/" + l.tier + ":" + l.partOverlays + "+" + l.faceOverlays) : null,
      opaque: view.filter((r) => r.opacity >= 1).length,
      looks: view.reduce((acc, r) => { acc[r.look] = (acc[r.look] || 0) + 1; return acc; }, {}),
    };
  }),
};
