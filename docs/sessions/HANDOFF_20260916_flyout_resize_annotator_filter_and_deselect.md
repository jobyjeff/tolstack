---
priority: high
depends_on: [viewer_hover_deslop_and_banner_purge]
model: opus
---

# HANDOFF 2026-09-16 — flyout_resize_annotator_filter_and_deselect: resizable 3D flyout, element-scoped left menu, face deselect, full-page link, and one alert badge

Source: Jeff's 2026-09-16 forge note `20260916T175137_lj0lgi`, "# 3d flyout"
section (his screenshot:
`C:\workspace\forge\data\inbox\atomic-notes\attachments\20260916T175137_lj0lgi\paste-20260916T172223.png`).
Baseline: `master` after `viewer_hover_deslop_and_banner_purge` (you are
sequenced behind it; both edit `topology_app.js`). Scope: the flyout
(`apps/viewer/topology.html:130-144`, `topology.css:615-636`,
`topology_app.js:826-862`) and `apps/annotate/` (app.js, scene.js, style.css,
binding_state.js) + tests. Do NOT touch: the hover-card/banner code the
previous handoff just landed; `docs/topologies/*.json`; the bindings inbox
(append-only events only, through the sanctioned writer).

Jeff's builds have hit stale-served-JS repeatedly — **verify each complaint
against current master first** and record already-fixed items in the lesson
instead of re-fixing. Known case: he asked to "move the flyout to the right
side", and on master the flyout is **already right-docked**
(`topology.css:622`, `inset: 0 0 0 auto`) — confirm it renders that way and
treat the ask as satisfied unless something disagrees.

## Deliverables

1. **Resizable flyout.** `dialog#annotate-flyout` is fixed
   `width: min(760px, 55vw)` with no divider. Jeff: "make it resizable (it's
   too narrow to be useful)." Reuse the preview-pane divider pattern —
   `wireDetailDivider` / `onResizeStart` / `applyResize`
   (`topology_app.js:926-995`), pure clamp arithmetic in `views/topology.js`
   (the `VA.TOPO_PANE_WIDTH` shape), persisted width under its own
   localStorage key, keyboard nudge included. It resizes from its left edge
   (the pane is right-docked).

2. **The flyout scopes the annotator's left menu to the element it was opened
   from.** Jeff: "it should also auto-filter the left side menu to just the
   features that are in the element (node or edge) it was entered from."
   Today `cmdTrace`/`cmdGoto` scope the *element list* to the linked study
   (`annotate/app.js:191-192, 291-297`, `renderElementList` renders
   `state.currentStudy.selection`) but the **parts panel is not filtered at
   all** — `renderPartsPanel` (`app.js:604-643`) lists every installed mesh
   regardless of isolate state. When the annotator boots (or receives
   commands) with an `edge` target, filter both left-rail panels to that
   element's parts/features; a plain control ("show all") lifts the filter.
   Keep the standing architecture rule: everything is a named text command
   (`AA.exec` verbs, `app.js:302-316`) — add a `filter-panel`-shaped verb the
   UI and the deep link both drive, not a UI-only state.

3. **A face can be deselected.** Jeff: "I accidentally clicked a face … but
   there's no way to deselect a surface." Measured state: `state.currentPick`
   clears on empty-space click but the orange tint stays (`app.js:888-892`
   never calls `highlightFace`/`restoreColors` on a null pick —
   `scene.js:319-325` is only reachable from inside `highlightFace`); re-click
   does not toggle; no `deselect` verb exists. Fix all three surfaces
   consistently: empty-space click clears tint + pick, re-clicking the
   selected face toggles it off, and a `deselect`-shaped command verb exists
   (same rule as item 2: verb first, UI drives it). Also give element-row
   selection (`state.selectedEdge`, `app.js:419-423`) a clear path — clicking
   the selected row deselects, or an explicit control.

4. **"Open full annotator" from the flyout.** The flyout head
   (`topology.html:140-143`) has only title + Close; the new-tab link
   (`VA.annotateLink`, `viewer.js:104-114`) appears only in the degraded
   no-mount path. Add a plain link in the flyout head that opens the full
   annotator page in a new tab, carrying the same
   `topology/edge/study/isolate/trace` params the flyout booted with. Jeff:
   "There can be a separate link that opens the full viewer (with the full
   fledged menus etc) in a separate tab/page."

5. **One alert badge per row, details on hover.** Jeff: "Left side menu is now
   impressively 'loud'… roll all the alert badges into one single alert badge
   (something like a triangle ! icon). Mouse over the icon has a popup that
   lists out the actual alerts. Styling for the alert text themselves can then
   be a bit less obnoxious/overwhelming, especially the ones in the source
   column that are always visible." Two rails qualify — do both:
   - annotator element list: the per-row state badge
     (`annotate/app.js:388-417`, `AA.BINDING_STATES`,
     `binding_state.js:29-34`) — keep the *color* signal on the row, collapse
     the words into one ⚠-style icon whose hover popup names the state(s) in
     everyday words;
   - viewer stack-table source column: the always-visible loud chips
     (`sourcingCell`, `views/stack.js:215-273`, `VA.EXPORT_CHIP_TEXT`
     all-caps strings) — same consolidation, quieter type. The information
     must stay reachable (popup/expanded row), never deleted; a row with no
     alerts shows nothing (standing rule: disabled/absent features show
     NOTHING).
   Vocabulary stays in its module-level constants (`VA.EXPORT_CHIP_TEXT`,
   `AA.BINDING_STATES`) — you are changing presentation, not words; if a word
   must change, it changes in the constant and its paired tests.

## Definition of done

- Verified in a real browser (served mode, live projections at
  `C:\workspace\tolstack\data\projections\viewer\`): screenshots under
  `docs/sessions/lessons/` of (a) the flyout resized wide next to the DAG,
  (b) the left rail filtered to one element's parts with the "show all"
  control visible, (c) a row with the consolidated alert icon + its hover
  popup open, (d) before/after of the stack source column.
- Deselect: a test at the command layer (the verb clears pick + tint state)
  plus the empty-click and re-click paths covered at whatever tier can reach
  them; manual verification recorded if the browser tier cannot.
- All three tiers green (`pytest -q`, `run_tests.cjs`, browser runner, all
  with `--repo C:/workspace/tolstack`).
- Lesson (`docs/sessions/lessons/LESSONS_20260916_flyout_resize_annotator_filter_and_deselect.md`):
  stale-build items found already fixed; the filter verb's name and shape;
  how the two alert rails ended up sharing (or not sharing) a popup
  mechanism.
