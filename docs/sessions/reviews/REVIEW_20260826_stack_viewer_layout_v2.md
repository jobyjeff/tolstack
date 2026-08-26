---
type: review
handoff: HANDOFF_20260825_stack_viewer_layout_v2
reviewer: review agent (review/stack_viewer_layout_v2)
date: 2026-08-26
verdict: APPROVE
blockers: 0
---

# REVIEW — `stack_viewer_layout_v2`

Scope: `apps/viewer/` only (a grid-like elements table, a new right pane for
full source detail on row selection, and the worksheet moved below the table
into a collapsed `<details>`). 1 commit, 12 files, 938 insertions / 294
deletions. **Not a tolerance stack** — no new tolerances, `source_ref`s or
arithmetic — so the overlay's seven mandatory checks do not apply as written.
What does apply, and is what I concentrated on: does the new layout still
render provenance honestly, and does moving code around (`stack.js` →
`detail.js`/`dom.js`/`viewer.js`) preserve every fact the old composite cell
carried.

## What I verified

**Merged before judging, twice — master moved under me both times.**
`review/stack_viewer_layout_v2` was cut from `master` before
`fastener_stack_shadow` landed (a new `rotor_fastener_length` stack) and again
before the board-update commit that followed it. I merged `master` into the
review branch, then `handoff/stack_viewer_layout_v2` (clean, no conflicts —
the two touch disjoint files), and tested the tree that will actually ship,
not the tree the branch forked from.

**Four test tiers, all re-run by me on the final merged tree, all green:**

| tier | command | result |
|---|---|---|
| pytest (main checkout) | `venv-win/Scripts/python.exe -m pytest -q` | **473 passed** |
| fast JS, fixtures only (worktree) | `node apps/viewer/run_tests.cjs` | **113/113** (`SKIP node-fs tier` — honest, `data/` is empty in a worktree) |
| fast JS incl. `[real]` node-fs tier | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` (run **from the worktree**, so the branch's own `run_tests.cjs`/`tests.js` are what execute — `--repo` only redirects the gitignored `data/` read) | **142/142** |
| browser truth tier (installed Chrome 151 over CDP, `file://` **and** `http`) | `npm install && node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **4/4 checks** (`[suite] 113/113` both transports, `[app] 26/26 sub-checks` both transports) |

`node_modules/` was absent in both checkouts (gitignored); I ran `npm install`
myself in both rather than trusting the lesson's "4/4" on faith, and it
reproduced exactly, including the two real layout bugs the lesson describes
catching (verified by reading the diff, not just by the tier passing — see
below).

**Rebuilt both projections against the current main checkout** (forward
slashes on `--data-root`, per this overlay's newest entry — a backslash there
silently writes to the wrong place and I did not repeat that mistake):
`results.json` now includes `rotor_fastener_length` (11 elements, 9T/2I/0U);
`crops.json` re-resolved 37/59 identically. Both stamped `dirty: false`,
built from current `master`. Neither script wrote anything into
drawing-checker (`find data/runs -newermt '-15 minutes'` empty there,
before and after).

**Test pollution (universal check).** `git status --short` clean in both
checkouts after the full matrix (main checkout carries only the
pre-existing, documented `.dispatch.toml`). No stray run folders, no
modified fixtures.

**The one-fold rule holds, extended into the new files.** Grepped
`views/detail.js`, `views/dom.js`, `app.js`, `viewer.js` for arithmetic
operators on a projection field: none. The only numeric-looking op is
`img.style.aspectRatio = entry.width + " / " + entry.height`, a string
concatenation of `crops.json`'s own recorded pixel size, same pattern the
existing popover already uses.

**Every fact the old composite cell carried still reaches the page —
verified by reading both sides of the move, not by trusting the diff's own
framing.** `exportProvenanceBlock`/`runsLine`/the export-chip table/
`clampedNote` were relocated (not rewritten) from `views/stack.js` into
`views/detail.js`/`viewer.js`/`views/dom.js`; diffed each moved function
body against its origin and they are verbatim apart from parameter
plumbing (`config` now passed explicitly rather than read off `VA.CONFIG`
inside the module). The compact row keeps exactly one thing the handoff's
own suggested three-chip design would have dropped: the loud
export/identity chip (`unestablished` / `unlabelled` / `identity_unlabelled`)
— a deliberate, disclosed deviation (lesson, "Layout decisions Jeff should
look at"), and it is the right call given check 6/the export-provenance
checklist's "impossible to miss from the row" requirement in prior reviews.

**Selection model.** Clicking a row calls `onElementSelect`, highlights via
`.el-row--selected` (a real `outline`, asserted on computed style by the
browser tier, not just a class name), and populates the right pane; a
missing handler or no selection are both handled without throwing (tested).
Confirmed the `el-row` class — and hence `cursor: pointer` — is scoped to the
elements table only (`grep` for `classes = ["el-row"`: one call site), so the
materials table's rows don't inherit a misleading pointer cursor.

**Manual visual check**, `?mock=1` via a throwaway Playwright script (deleted
after): grid rows render at consistent height, the selected row shows a
visible blue outline, and the right pane populates with chips, callout, full
note, export block and crop section — matches the DoD's description.

**Worksheet placement**, checked both structurally and by reading the
rendered page: native `<details id="worksheet-wrap">` sits after `#stackview`
in the DOM, collapsed by default (`showWorksheet: false`), toggled by its own
`<summary>` or the topbar button (tested both directions in the browser
tier). A dedicated test (`tests.js`, guarded by the new `VIEWER_SRC` sandbox
object) reads the **shipped** `index.html`/`app.js` text rather than
skipping the placement assertion — and reads it from `here` (this worktree),
never through the `--repo` seam, so a worktree run cannot accidentally pass
by checking `master`'s stale HTML. Confirmed this guard actually discriminates
by deleting the `showWorksheet: false` line from a scratch copy of `app.js`
and re-running: red, naming the right assertion.

**The drawing-checker back-link (deliverable 3).** The lesson's account
(dispatched a fresh agent to read `webui/main.py`/`pipeline/containers.py`,
found no `/drawing/<number>`-keyed route, declined to invent one) is
consistent with what ships: `detail.js` reuses `VA.runUrl`/`VA.fileUrl`
verbatim, no new URL-construction logic, `config.js` untouched (the
`drawingCheckerWebui` base it would have needed already existed pre-handoff).
Correctly not overclaimed — the "left for the next agent" section names this
as researched-and-declined rather than done.

**Doc hygiene.** `apps/viewer/README.md`'s Layout block, "Selecting an
element," "Which bytes..." and "Worksheets" sections all updated to match the
new structure; no stale count or "both"/"only" language introduced.
`ARCHITECTURE.md` carries no viewer-pane-layout description to go stale.
No `PROVENANCE.md` row needed (nothing imported). No `{{` placeholders, no
NUL bytes, no `</invoke>`/`</content>` leakage, no whole-file reformat hiding
a diff (`git diff -w --stat` tracks the plain diff closely on every changed
file).

## Findings

### Nits (not fixed — cosmetic/coverage, not defects)

- **`VA.renderWorksheet` now runs on every `render()` call regardless of the
  `<details>`'s open state.** Previously gated on `state.showWorksheet`; now
  unconditional, so the worksheet's markdown re-parses on every row click even
  while collapsed. Harmless (the native `<details>` still hides it), just an
  unconditional cost that wasn't there before. Not worth blocking on.
- **The right pane's inline crop image has no `[real]` end-to-end test**
  wiring a real `readCropImage()` result into `VA.renderDetail` and asserting
  `img.detail__crop-img` gets a real src. The pieces are each tested
  separately (a `[real]` test confirms every resolved crop's PNG exists on
  disk; a fixture test confirms the DOM renders correctly given a `cropImage`
  object) but the full path isn't exercised together — this exactly mirrors
  the pre-existing gap in the crop popover (which has the same untested
  integration boundary, for the same reason: `FsaAdapter.readCropImage`
  requires a live folder grant no automated tier can drive). Not new, not a
  regression, just noting the boundary is inherited rather than closed.

No blockers. No invented values (this handoff authors no tolerances), no
sign errors (no arithmetic touched), no stale counts, no vocabulary drift —
`VA.EXPORT_CHIP_TEXT`'s move from a private `stack.js` var to `viewer.js`
does not add it to the Python/JS vocabulary pairing (`tests/test_js_python_vocabulary.py`
only scans for six specifically-named tables; confirmed by reading the
pairing test rather than assuming).

## Note for the next reviewer

Added one entry to this overlay's "Recurring bugs to check": a CSS/layout
change is unverified by the fast tier alone, because the DOM shim has no
geometry. This handoff's own lesson documents the browser truth tier catching
a real `min-width: auto` / overflow bug the fast tier's 100%-green run missed
entirely; I re-derived that bug's mechanism from the diff and re-ran the
truth tier myself rather than taking "4/4" on trust.

## Verdict

**APPROVE.** No blockers, two cosmetic/coverage nits recorded and not
fixed (neither warrants a rework loop). Provenance moved wholesale from the
old composite cell into the new right pane without losing a fact along the
way, the loud export/identity chip stayed on the row where the "impossible to
miss" requirement from prior reviews needs it, the drawing-checker back-link
was researched and honestly declined rather than guessed, and the one real
bug this handoff shipped with (the layout-overflow/pointer-interception
issue) was caught and fixed by the author's own truth-tier run before I ever
touched the branch — I re-verified rather than re-discovered it.
