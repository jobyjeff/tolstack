// A filmstrip scenario (scripts/filmstrip.mjs --scenario <this file>) for
// handoff the_page_is_a_fixed_layout_and_nothing_scrolls_the_document
// (2026-11-14). NOT a tier -- pytest never collects it. The end-stop model v2
// with both regions at their tops; the trigger is a click on the tree's last
// interface row, whose dimension sits at the bottom of the grid and of the
// DAG. The frames show the grid's own region and the DAG's own region each
// scrolling the selection into view, and the document not moving.
//
//   node scripts/filmstrip.mjs --scenario tests/debug_filmstrip_tree_selection_scrolls_regions_20261114.mjs
//        --viewport 3840x2160 --width 2400 --frames 6 --interval 120 --real-time
//        --repo <a data root built from this tree> --out <dir> --name tree_selection
const V2 = "vpa_end_stop_v2";

export default {
  async setup(page, h) {
    await page.goto(`${h.base}/apps/viewer/topology.html?topology=${V2}`, { waitUntil: "load" });
    await page.waitForSelector("#topogrid tr.tvrow", { timeout: 30000 });
    await h.settled(page);
    // The tree's interfaces open, so its rows are there to click.
    await page.evaluate(() => {
      document.querySelectorAll("#navtree [aria-expanded='false']").forEach((t) => {
        if (t.closest(".navtree__row--group")) t.click();
      });
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      ["#topopane .tv__hscroll", "#topogrid .tv__gridscroll"].forEach((sel) => {
        const n = document.querySelector(sel);
        if (n) n.scrollTop = 0;
      });
    });
    await page.waitForTimeout(300);
  },
  async trigger(page) {
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("#navtree .navtree__row--interface"));
      const last = rows[rows.length - 1];
      if (!last) throw new Error("no interface row in the tree");
      last.scrollIntoView({ block: "center" });
      last.click();
    });
  },
  probe: (page) => page.evaluate(() => {
    const dag = document.querySelector("#topopane .tv__hscroll");
    const grid = document.querySelector("#topogrid .tv__gridscroll");
    const sel = window.ViewerApp && window.ViewerApp.__lastSelection;
    const row = grid.querySelector("tr.tvrow--selected");
    const r = row ? row.getBoundingClientRect() : null;
    const g = grid.getBoundingClientRect();
    return {
      dagScroll: dag.scrollTop, gridScroll: grid.scrollTop,
      docScroll: document.scrollingElement.scrollTop,
      selectedRow: row ? row.getAttribute("data-id") : null,
      rowInGrid: r ? r.top >= g.top && r.bottom <= g.bottom : null,
      selection: sel || null,
    };
  }),
};
