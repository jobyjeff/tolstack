---
type: bug
priority: med
status: resolved
area: tests/browser annotate [real]
reporter: agent
class: test_bound_to_live_data
found_by: docs/sessions/HANDOFF_20261121_the_viewer_node_suite_runs_inside_its_default_tier_timeout.md
---

# Two annotate browser suites assume live features are still unbound, and are red on every tree

Two browser suites are red on `integration` `8ba9e509` and on the review merge
`94f72834`. They fail the same way run whole and run alone with `--only`,
against one scratch root copied from the main checkout's `data/` on
2026-11-22. So this is not the whole-tier flake that
`ISSUE_20261120_the_pattern_suites_parts_filter_count_is_red_in_the_whole_browser_tier_and_green_alone.md`
(deferred) and
`ISSUE_20261117_the_suggestion_names_its_face_suite_flakes_with_the_mount_line_never_appearing.md`
(resolved) describe.

- **a suggestion names its face and the mate ranks the other side**: 3 of 5
  checks pass. `MISSING: the mount's suggestion line`, then `names face NaN`,
  then `Take wrote []`. Red sub-checks: `[real] hovering a suggestion line in
  the tree lights its face in the pane` and `[real] Take on a suggestion line
  writes one accept event`.
- **a pattern is bound as its like faces …**: 8 of 11 checks pass. The offer
  for face 744 appears (`10 of 10 holes`, 20 faces lit), but every Take writes
  a `supersedes` of an existing `annotate-…` event, for example
  `hub_boss_to_tan_link_mount_fasteners`. The filter count also stays at
  `65 (was 65)`. Red sub-checks: `[real] a click on face 744 offers the bolt
  circle's ten holes … writing nothing`, `…and so does the Preview`, and
  `[real] binding one feature drops the filter's count by one`.

**Likely cause.** The checks pick their subject features by name from the
live projection and assume each one is unbound or still proposed. Jeff has
been binding features (`data/inbox/feature-identity/` has events up to `0115`
on 2026-11-22), so those features are now bound, and the checks fail with a
true outcome. This is the "test bound to … a count live data can change"
class. A fix should pick the subject at run time: the first proposed feature,
or the first unbound pattern hole. It should not name a feature that Jeff's
next Take can retire.

Evidence: the scratch logs `data/scratch/rv_ns_base1.txt` and
`rv_ns_base2.txt` (baseline), and `rv_nodesuite_only1.txt` and
`rv_nodesuite_only2.txt` (merge), in the main checkout.

## Sighting 2026-11-22 -- a_body_row_in_the_nav_takes_a_resting_hover_every_time (review)

Same two reds on that review's merge, whole tier 47/49 (ledger 2026-11-23T07:35:06Z).
Baseline pair against one scratch root, `--only` each: a `git archive integration`
export gave **3/5** and **5/11**, and the merged tree straight after gave **3/5** and **8/11**.
So the pattern suite's count also moves run to run. `MOUNT_FACE`
(`tan_link_mount_215175_002@tan_link_mount_hub_face`) appears in
`0101_tan_link_mount_height_accepted.json` (2026-11-22 20:28 local). Also worth
fixing in the same change: both suites settle on `__sweep.bodies`, which that
handoff measured as true ~15 s before the pane's `annotate:exec` queue drains.
Settle on the `scene-view` barrier instead.

## Addendum 2026-11-23 — resolved

Both suites (`a pattern is bound as its like faces…`, `a suggestion names its face…`) retired with the feature body in editing_a_feature_opens_its_form_where_the_tree_was. Their replacement, `a feature's form`, reads which features are bound from the served log and edits bound ones (the pilot, the bushing bores, the hub's one-hole clocking), so it does not assume a live feature is unbound.
