---
type: review
handoff: docs/sessions/active/HANDOFF_20261112_the_page_is_a_fixed_layout_and_nothing_scrolls_the_document.md
reviewer: agent
date: 2026-11-14
verdict: APPROVE
blockers: 0
---

# Review — the_page_is_a_fixed_layout_and_nothing_scrolls_the_document

**Verdict: APPROVE.** The page is a fixed shell: tree, 3D pane, DAG and the
settings/grid/Preview column each scroll alone, the document overflows by 0/0
at every measured size, and one control switches side by side · 3D · DAG.
I fixed two small things inline (below). Merged as a fast-forward:
`integration` had not moved since the branch was cut (`88ef0f71`), so there
was no conflict.

## What I verified

- **Which run I reviewed:** the one tactical run. Branch `99dbab20`, 25
  commits. The lesson arrives as `A`, not `M`. My review branch had no prior
  attempt.
- **Handoff deliverables**:
  1. **The fixed shell.** `topology.html` puts the title and tree in
     `.tv__left`, the 3D dialog, `#topopane`, `#side-divider`, then `.tv__main`
     (banner, toolbar, `#topogrid`, totals, row divider, Preview).
     `html, body { height: 100%; overflow: hidden }`. Four seams are each
     remembered under their own key (nav, flyout, side, Preview).
  2. **The view control.** `VA.PANE_VIEWS`, `?view=` and `VA.PANE_VIEW_KEY`
     are fast-tier pinned. Choosing "DAG" hides the 3D dialog without closing
     it. Leaders draw only side by side (`leadersDrawable`).
  3. **The five traps**, each confirmed in the tree:
     - `testHeightBudget` is rewritten for the region model.
     - `paneScroller`, `tv__scroll--bounded`, `pinTopoHead`, `stickyOffsets`
       and `--bar-h` are gone. `git grep` finds them only in history prose.
     - The grid header is `position: sticky` inside `.tv__gridscroll`.
     - The stale layout comments are rewritten.
     - The 3840 issue is resolved with measurements.
  4. **Leaders.** DAG-to-grid leaders are switched off (`style: "off"`) and
     the leftover geometry is handed off as a strategy issue
     (`ISSUE_20261114_the_dag_still_lays_out_for_a_grid_beside_it_that_has_its_own_region_now.md`,
     `audience: strategy`). The handoff's fence ("do not change how the DAG is
     laid out") is respected.
- **The lesson's numbers**, re-derived from the committed `measurements.json`
  files: side by side 1189/1201 (3840) and 1829/1841 (5120); "3D" 2391/3671;
  "DAG" 2390/3670; at 1920, a 485 (v2) / 558 (v1) / 958 DAG region, a 660 px
  column and a 1132 px table. v1's scroll heights are 3982 and 2600. Overflow
  is 0/0 in all 18 cases. The aspect ratios (0.56, 0.85, 1.1, 1.7) re-derive.
  The "37 reworded guards" count matches the issue's table.
- **Shots I looked at:** both monitor sizes, both models, all three states;
  1920 v2 side by side; the chain-study click-around (step 13). The layout
  matches Jeff's description. One design nit is filed (below).
- **Contribution column:** 270 → 172 px, justified by the widest total. Every
  column has `resizable: true`.

## Tests

The tactical report records a full-suite run (pytest `1 failed, 1977 passed,
1 skipped`, the documented worktree red; viewer 692/692; annotate 316/316;
browser `--only` per changed suite; witness `--only` per changed spec). I gave
it the benefit of the doubt. The merge was a fast-forward, so I skipped the
pre-merge subset and ran the risky tiers once, on the merged tree:

- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/fl1114`:
  **692/692**. That data root is the tactical one, built from a committed
  branch tree whose projection inputs equal this tree's. I re-added the
  `venv-win` and `node_modules` junctions.
- `node apps/annotate/run_tests.cjs`: **316/316**.
- **The whole browser tier**
  (`node scripts/run_viewer_browser_tests.mjs --repo <same root>`):
  **44/44 suites**, 1600 s. The runner recorded its own `merge` row in the
  ledger, inside budget.
- **The witness gate** (`--changed-since integration`, capped at 30 min):
  **39/40 witnessed**, 40 of 144 reached, 104 left to the sweep (budget),
  1767 s, which I recorded by hand. The one miss was
  `fast__the-nav-width-is-remembered-under-its-own-key-and-a-stor__912dbafd`
  (see inline fix 2). After the fix, `--only` reports **1/1 witnessed**.
  `pytest -q tests/test_mutation_witnesses.py` passes 44/44.
- **Default `pytest -q`**, post-merge, in this worktree: `1 failed, 1977
  passed, 1 skipped, 2 deselected` in 468 s (recorded, inside budget). The one
  failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`,
  the worktree red: there is no `data/projections/` in a worktree. The tier it
  wraps passed 692/692 through `--repo` above. This repo's conftest prints no
  contention header lines.
- The main checkout's `git status` was clean after the runs.

## Findings

### Fixed inline (all three prongs hold: no behaviour change, no test needed, a few lines)

1. **A stale comment the diff created.** `apps/viewer/views/topology.js`,
   above `VA.PANE_WIDTH_KEY`. It cited "topology_app.js's own comment on
   `jogZoneScale`", which this branch deleted, and said two widths are
   remembered (there are four). Rewritten (`b8884e67`).
2. **A decayed mutation witness the branch caused.** The branch renamed
   `PANE_WIDTH_KEY` from `tolstack.viewer.detailWidth` to `…sideWidth`. The
   nav key's spec made `NAV_WIDTH_KEY` equal `detailWidth` to prove "one key
   per control", but that value now collides with nothing, so the guard
   stayed green. I re-pointed the spec's `replace` at `sideWidth`, with a
   dated note. It is witnessed again. The author's `--only` runs could not
   see this, because the spec was not one they touched. Only the
   `--changed-since` gate reaches it. I added this as a new entry to the
   overlay's **Recurring bugs to check**.

### Nits / design (filed, non-blocking)

- `ISSUE_20261114_design_the_totals_strip_under_a_long_grid_is_cut_mid_heading.md`
  (`priority: low`, `area: design`). Beside v1's long grid the study-summary
  strip shrinks to about two lines, and its "What's missing (99)" heading is
  cut through the middle by the Preview's divider. It is reachable by
  scrolling, but it reads as broken.

### Noted, already owned

- 37 reworded browser guards have no spec. The branch lowered the browser pin
  for them (850 declared / 819 enrollable). The unenrollable count went from
  33 to 31, so the pin claims nothing new. They are listed in
  `ISSUE_20261114_reworded_browser_guards_of_the_fixed_shell_carry_no_spec.md`.
- The DAG still sizes a jog zone for leaders it no longer draws
  (`ctx.jogZoneScale` is now always undefined, so the layout uses its
  default). This is fenced out of the handoff and owned by the strategy issue
  above.

## For the next reviewer

On a diff that changes a constant's *value*, grep `scripts/mutation_witnesses/`
for the old value. A spec whose `replace` collides with that old value decays
silently.
