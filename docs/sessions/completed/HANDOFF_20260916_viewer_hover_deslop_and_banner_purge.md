---
priority: high
depends_on: [reader_facing_copy_and_vocabulary]
model: opus
---

# HANDOFF 2026-09-16 — viewer_hover_deslop_and_banner_purge: delete the banner provenance lines, de-duplicate the hover cards, fold long prose behind one disclosure, and make the popup reachable

Source: Jeff's 2026-09-16 forge note `20260916T175137_lj0lgi` ("De-slopification"),
tolstack viewer section — verbatim quotes inline. Baseline: `master` after
`reader_facing_copy_and_vocabulary` merges (you are sequenced behind it — it
rewrites copy in `viewer.js` and `views/*.js`; read its lesson first). Scope:
`apps/viewer/` (banner, cards, crop, topology_app hover positioning, CSS) +
their tests. Do NOT touch: `apps/annotate/` and the flyout
(`HANDOFF_20260916_flyout_resize_annotator_filter_and_deselect` owns those,
sequenced after you); `scripts/build_*_projection.py`; `docs/topologies/*.json`
authored values; `docs/reference/` (insert-only); `data/inbox/specs/`
(append-only).

Jeff's builds have hit stale-served-JS three times before — **verify each
complaint against current master first**; where a fix already landed, record
that in the lesson and move on rather than re-fixing.

## Deliverables

1. **Delete the five always-visible banner lines.** Jeff: "These 5 lines at the
   top of the page are meaningless to the user. Delete." They are rendered by
   `apps/viewer/views/banner.js` (READY branch): the transport line
   (`banner.js:63-66`), `VA.builtLine` (`banner.js:67-68`, built at
   `viewer.js:1236-1253`), `VA.cropRulesLine` (`banner.js:71-72`), and the two
   `VA.provenanceLine` rows (`banner.js:146-149`). Nothing always-visible
   remains. The **stale-data alarm** (`provenance()`, `banner.js:108-150`, the
   "⚠ Data is older than the latest code" `<details>` + rebuild affordance)
   **stays** — that one earns its place by firing only when something is wrong.
   The deleted lines' content may live *inside* that details block or a small
   collapsed disclosure if the tests that pin `builtLine`/`cropRulesText` want
   a rendered home; collapsed-by-default is the requirement, deletion is the
   default.

2. **One document statement per hover card.** Jeff's example: the reference
   "NAS6403-NAS6420 Rev 4.pdf · sheet 3" is stated, then restated in a "read
   from the export this citation names … sha256 VERIFIED · showing the declared
   region …" sentence. Today a card can print the same drawing three times:
   `citationWhere` at `cards.js:86-88`, `VA.cropReference`'s unconditional
   `entry.pdf_name + " · sheet " + entry.page` head (`crop.js:145-148`), and
   the drawing-checker link text (`crop.js:159-162`). Collapse to **one**
   concise where-line per card (document · rev · sheet, with the link carrying
   part number + revision as its text — that convention already exists in
   `views/crop.js`); the crop image needs no caption restating the file it
   came from. Same for the component/node cards' "crop of its \`edge_name\`
   annotation" captions (`cards.js:142-146`, `cards.js:195-200`) — a backticked
   internal edge id is not user copy; either drop the caption or use the
   element's display name. Also: a part number is never printed on two
   consecutive lines (Jeff's `214820-002` example — title says it, the
   drawing line repeats it).

3. **All long-form prose folds behind one "data source" disclosure.** Jeff:
   "for now just put all the long form text into a collapsible element (data
   source), may delete it entirely later" — and "User doesn't care when or
   which tactical handoff a reference was added." The carriers: `card.note`
   render paths (`cards.js:134`, `:185`, and the **unclamped**
   `.hovercard__notefull` at `cards.js:228`), the export/identity provenance
   paragraphs (`cards.js:230-236`), and the crop-match explanation (already a
   `<details>` at `crop.js:175-180` — fold it into the same single
   disclosure rather than keeping a second one). Requirements: each card shows
   at most a **short** always-visible description (the existing 3-line clamp
   is fine for the part description sentence); everything else — sourcing
   narrative, gap essays, sha/match provenance — goes inside ONE
   `<details class="…">Data source</details>` per card. Do not edit the
   records themselves: the notes are the topology documents' own prose and
   `VERBATIM_PROSE_CLASSES` protects them — this is a *placement* change, the
   viewer chooses what is prominent. (If specific notes are so
   handoff-/audit-flavored they hurt even inside the disclosure, list them in
   the lesson as authoring candidates — do not rewrite the JSON here.)
   Workbook references (e.g. "cells G7/H7") count as long-form and go in the
   disclosure too, per Jeff's "in some cases the text might be useful (for
   example when it references an excel worksheet)" — kept, just not loud.

4. **Make the popup reachable by mouse.** Jeff: "sometimes the preview pop-up
   disappears when you try to move the mouse over it, you have to do it just
   right." Diagnosis (measured 2026-09-16): there is **no** mouseleave/hide
   timer — the card is being *replaced* or *moved*, not closed:
   (a) every trigger the pointer crosses en route fires `mouseenter` →
   `showCard` re-targets the shared `#croppop` (`topology_app.js:692-710`),
   and the DAG's fat hit areas (`.rail__barhit` stroke 14,
   `topology.css:233`) make the corridor crowded; (b) each image
   `onload` re-runs `position()` (`topology_app.js:704-708`), which can flip
   the card above/below mid-approach. Suggested directions, prototype and
   report rather than follow blindly: suppress re-targeting while a card is
   open and the pointer is moving toward its box (a hover-intent grace, or
   ignore `mouseenter` from *other* triggers for ~150-300 ms after open);
   reserve image height up front from `--crop-ratio` so `onload` never moves
   the box. Respect the recorded constraint at `topology_app.js:808-816` (the
   non-clamp that prevents an undismissable card) and the design note at
   `views/stack.js:287-293` (close-on-mouseleave was already tried and
   rejected).

5. **Preview pane: wider by default, discoverable resize.** Jeff (09-15 note,
   still open): "Make the right side preview pane resizable. It's too narrow."
   The pane HAS a drag divider since 2026-09-15 (`topology.html:47-49`,
   `topology_app.js:926-940`, clamp `VA.TOPO_PANE_WIDTH = {min 320, max 1000}`
   at `views/topology.js:552`) — so the live problems are the **430px
   default** (`topology.css:571`; note the 560px attempt and revert recorded
   at `topology.css:560-569` — read that reasoning before repeating it), the
   1000px max, and that nothing announces the divider exists. Raise the
   default meaningfully, consider a higher max, and give the divider a visible
   affordance (grip dots / hover highlight). Mind
   `ISSUE_20260915_a_wide_preview_pane_can_cover_the_grids_own_drag_grips.md`
   — widening the default makes that overlap more likely, so address or
   explicitly bound it.

## Definition of done

- Verified in a real browser against the live projections
  (`C:\workspace\tolstack\data\projections\viewer\*.json`, served mode,
  `--repo C:/workspace/tolstack`): screenshots committed under
  `docs/sessions/lessons/` of (a) the page top with no provenance lines,
  (b) the `214820-002 plain bushing` and NAS bolt hover cards showing one
  where-line + collapsed "Data source", (c) the same card with the disclosure
  open.
- A browser-tier test that exercises the hover-approach path (open card →
  move pointer across an adjacent trigger toward the card → card survives) —
  or, if the runner cannot express pointer paths, the closest value-level
  proxy plus a manual verification recorded in the lesson.
- All three tiers green: `venv-win/Scripts/python.exe -m pytest -q`,
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`,
  `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`.
  Tests pinning the deleted banner strings move with the change.
- Lesson (`docs/sessions/lessons/LESSONS_20260916_viewer_hover_deslop_and_banner_purge.md`):
  which complaints were already fixed on master (stale-build items); the
  hover fix you chose and the failure mode it trades away; any note text
  flagged as an authoring candidate; where the banner content ended up.
