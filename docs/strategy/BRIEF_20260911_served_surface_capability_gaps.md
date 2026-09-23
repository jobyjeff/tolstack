# BRIEF 2026-09-11 — served-surface capability gaps: what the drawing-checker mount can reach, read, and drive

Filed by triage 2026-09-11, consolidating four open issues that are all
facets of one question: **the drawing-checker-served surface
(`http://127.0.0.1:8000/tolstack/...`) is the surface Jeff actually uses day
to day, and it is systematically the least capable one.** Each issue was
filed separately from a different handoff's review; a strategy session should
decide the served-surface capability contract once, then decompose — the
fixes overlap (mounts, the http transport pattern, the rebuild endpoint) and
staging them independently would collide.

## The four issues (read each; they carry the measured details)

1. `docs/issues/ISSUE_20260910_annotate_has_no_http_read_transport.md`
   (feature, med) — the annotator has only FSA and memory adapters, so served
   under drawing-checker's mount it shows nothing until a folder grant, even
   for pure reads; the viewer already solved this shape
   (`apps/viewer/storage/http.js`, handoff `viewer_http_transport`). Open
   sub-question: whether drawing-checker's DATA_MOUNT serves `data/meshes/`
   at all — if not, that mount decision is the real blocker.
2. `docs/issues/ISSUE_20260909_served_via_drawing_checker_cannot_reach_worksheets.md`
   (feature, low) — the sibling-data-mount shape exposes only the viewer app
   and `data/projections/viewer/`, never `docs/`, so worksheets are
   unreachable exactly on Jeff's daily surface. Directions weighed in the
   issue: a third narrow read-only mount on the drawing-checker side for
   `docs/tolerance_stacks/` + `docs/topologies/`, or accept the gap and make
   it visible instead of a silently hidden toggle.
3. `docs/issues/ISSUE_20260910_dc_container_links_not_derivable_from_viewer_data.md`
   (feature, med) — hover cards can't build stable `/container/<id>` links
   because container ids are opaque and nothing in the viewer's data carries
   them. One fix per repo: `scripts/build_viewer_crops.py` folds
   drawing-checker's `data/containers/` attach events and stamps
   `container_id` onto crop entries, or drawing-checker exposes a by-run
   resolver route. Which side owns it is the strategy call.
4. `docs/issues/ISSUE_20260910_other_viewer_surfaces_still_print_terminal_commands.md`
   (chore, med) — four more missing-projection messages
   (`views/banner.js::missing()`, `views/crop.js:26`, `views/topology.js:124`,
   `apps/annotate/app.js:586`) still render terminal commands, against Jeff's
   binding web-UI rule. All fire on "nothing built yet", which the rebuild
   endpoint (`tolstack_mount_rebuild_endpoint`) also covers — the follow-up
   should reuse that handoff's `capabilities().rebuild` probe and
   `requestRebuild()`/`readRebuildStatus()` adapter methods, not add a second
   copy. Decide: does every missing-projection message get the
   button-or-sentence treatment, and does the annotate app get the same
   probe?

## What strategy should produce

- One decision on the served-surface contract: which of
  {projections, meshes, worksheets/docs, rebuild driving} the
  drawing-checker mount is supposed to expose, and which side (tolstack
  transport vs drawing-checker mounts/routes) owns each piece. Note items 1,
  2, and 3 each have a drawing-checker half — cross-repo handoffs need
  repo-prefixed coordination and sequencing against
  `tolstack_mount_rebuild_endpoint` (check its board state first).
- Tactical handoffs (with `depends_on:` where the rebuild endpoint or a
  mount change gates the UI work), or an explicit decision to accept a gap
  with a visible degradation message.

Constraint to carry into every decomposed handoff: Jeff's rule that terminal
commands in a web UI are unacceptable, with case-by-case exceptions only he
approves.

## 2026-09-21 triage sweep — item 4's last site is staged; the gate you were sequenced behind has lifted

Filing note only; nothing below decides any of this brief's four items.

- **Item 4 is now fully routed.** Three of its four terminal-command sites were
  already removed (`apps/viewer/views/crop.js` records "Removed 2026-09-15");
  the fourth, `missing(text, command)` in `apps/viewer/views/banner.js` with two
  call sites in that same file, is staged as deliverable 1 of
  `docs/sessions/HANDOFF_20260921_policy_free_brief_residues.md`. Do not
  re-stage it. That handoff is fenced out of `apps/annotate/storage/` and out of
  every cross-repo question, so items 1–3 are untouched.
- **The sequencing gate has lifted.** This brief says to check the board state
  of `tolstack_mount_rebuild_endpoint` before sequencing. It is in
  `drawing-checker/docs/sessions/completed/HANDOFF_20260910_tolstack_mount_rebuild_endpoint.md`.
- **Item 1 is still live as described**: `apps/annotate/storage/` holds
  `adapter.js`, `fsa.js` and `memory.js` — no `http.js`.

## 2026-09-23 consolidation — item 5: the viewer entry shim's ownership (absorbed brief)

Merged in by the 2026-09-23 triage sweep's consolidation pass (40 open briefs
workspace-wide, over the 15 threshold), absorbing
`BRIEF_20260911_viewer_entry_point_redirect_ownership.md` — same question, a
different file. Both briefs were filed by the same 2026-09-11 sweep and both ask
**where the tolstack / drawing-checker line falls for the served viewer surface,
and which side owns each piece of it**: this brief's item 3 says "which side owns
it is the strategy call", the absorbed brief says "who owns the fix?". That is
one axis, asked twice.

Consolidation changes filing, not substance: nothing below is decided here, and
the absorbed brief's own sub-questions are carried over verbatim in effect.

**The instance.** `/tolstack/viewer/` serves `apps/viewer/index.html`, a pure
redirect shim to `topology.html` that redirects **two ways at once**:

```html
<meta http-equiv="refresh" content="0; url=./topology.html" />
<script>window.location.replace("./topology.html" + window.location.search);</script>
```

The `<script>` carries the query string; the `<meta>` cannot. Whichever the
browser honours decides whether `?mock=1` — and, more importantly, `?stack=<id>`,
the deep-link contract documented in drawing-checker's
`docs/sessions/lessons/LESSONS_20260910_analyses_viewer_deep_link.md` — survives
the hop.

**Measured 2026-09-11, and it is a latent hazard rather than a live defect.**
`scripts/debug_tolstack_viewer_boot_probe.mjs` against the real mount, over a
dozen probes: *the script always won* — two main-frame navigations, 27 requests,
last at 413 ms, nothing left in flight. The query string was preserved every
time. Hence `low`, and hence "do nothing" being defensible.

That measurement also **removes a scarier story**, which is worth keeping:
drawing-checker's `ISSUE_20260911_tolstack_panel_runner_stale_against_viewer_v2`
reported `/tolstack/viewer/?mock=1` re-requested ~2000 times in 12 s, attributed
to `index.html`'s `location.replace` re-entering. That did **not** reproduce in
any probe; the `networkidle` hang it was inferred from had a complete and
different explanation (a Playwright lifecycle wait straddling the document swap
never sees the new document's idle event). The storm is unconfirmed; the double
redirect that would explain one is real and still there.

**What item 5 adds to this brief's ownership question**, as three sub-questions
that do not collapse into items 1–4:

- **Who owns the fix?** The file is tolstack's and the one-line change is
  tolstack's to make. But drawing-checker *mounts* this page and deep-links into
  it, so a query-dropping entry point is its failure surface too — a clicked
  stack row landing unselected is a drawing-checker symptom with a tolstack
  cause. Decide whether that makes it a tolstack fix with a drawing-checker
  regression test, a coordinated pair, or something drawing-checker should stop
  depending on.
- **Should the shim exist at all?** This one is *tolstack-internal layout, not a
  boundary question*, and it is flagged here so the merge does not drop it:
  dropping the `<meta>` is the obvious minimum, but a redirect shim as the
  documented entry point of a deep-link contract is itself the fragile part.
  Serving `topology.html` at `/tolstack/viewer/` directly, or having
  drawing-checker's mount point at it, removes the hop instead of fixing it.
  That is the more durable answer and it costs more. The answer here largely
  follows from the ownership call above.
- **What pins it afterwards?** Nothing currently asserts the query string
  survives the entry point. Whatever is decided, the deep-link contract deserves
  a test on the side that would notice — and which side that is follows from the
  ownership call.

**Carried over verbatim, because it is the absorbed brief's own verdict on
waiting:** *"Doing nothing is defensible and should be said out loud if chosen.
The script wins every time measured, and the fix is one line whenever it stops
winning. What is not defensible is leaving it undecided a second time: this is
now the second handoff scoped away from it."*

**Sources.** drawing-checker
`docs/issues/ISSUE_20260911_mounted_tolstack_viewer_entry_point_double_redirects.md`
(the filing, with the probe results). Re-measure with
`venv-win/Scripts/python.exe tests/debug_tolstack_panel_browser.py` and
`node scripts/debug_tolstack_viewer_boot_probe.mjs <base-url> /tolstack/viewer/?mock=1`
(both in drawing-checker).
