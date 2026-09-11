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
