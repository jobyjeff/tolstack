---
type: bug
priority: med
status: resolved
area: viewer/real-tier
reporter: agent
audience: strategy
found_by: docs/sessions/reviews/REVIEW_20261103_the_dag_holds_still_and_the_filter_bar_stays_put.md
handoff: docs/sessions/HANDOFF_20261104_the_viewer_real_tier_follows_the_slide_re_author.md
resolution: resolved 2026-11-04 by handoff the_viewer_real_tier_follows_the_slide_re_author (c511273a, d3a7afae) for the [real] pins (63 leaders, 74 groups, band string, 24 forks); its browser-tier half is the_browser_tier_reds_left_after_the_slide_re_author's
---

# The viewer's `[real]` pitch_system pins read one leader behind `integration`'s topology, and two browser suites cannot click a row a leader hit covers

Measured in the review of `the_dag_holds_still_and_the_filter_bar_stays_put`, against
projections rebuilt from the merged tree into a scratch root. **Every red below is
identical on a detached `integration` worktree against the same projection**, so none
of them is that branch's.

- Fast tier (`node apps/viewer/run_tests.cjs --repo <scratch>`): 623/629. Reds: the
  pitch system's grouping (`62 !== 61`), band tint (`63 !== 62`), README before-total
  (`162 !== 160`), five forks (`24` expected, `23` got), the live-dot declared-part
  guard (`pitch_plate_pilot_in_piston_id` declares `pitch_plate_215177_001`), and the
  topology-fixture shape pairing (`[face, hardware_ref]`; see
  `ISSUE_20261026_topology_fixtures_lack_the_tags_fields_so_the_real_fixture_pairing_is_red_on_integration.md`).
- Browser tier: `topology` ×2 (four `[real]` sub-checks naming the product graph's 61
  leaders), `real render path (non-mock)` and `crop lightbox` abort on a Playwright
  `locator.click` of a grid row that an in-SVG `rail__leaderhit` path
  (`piston_heads_seat`) intercepts, and `kinematic study page` has 2–6 `[real]` reds.

Likely one cause: the 2026-10-26 fold of `pitch_system` into the one topology, and the
mount/bushing/slide-joint handoffs after it, added edges the literal pins and the
fixtures were not moved for. Not investigated here.

**Consequence:** the `[real]` tiers cannot discriminate a regression on `integration` for
these suites, and a reviewer has to run a baseline to read them (this review did). The
branch's own new guards ran on the real projection and passed.
