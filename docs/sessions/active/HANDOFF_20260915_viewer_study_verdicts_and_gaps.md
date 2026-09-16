---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-15 — viewer_study_verdicts_and_gaps: every study renders its verdict, its margin, and what's missing

Source: Jeff's 2026-09-15 review of the topology viewer (forge note
`20260915T145908_fwc7qp`): "None of the tolerance stacks in the entire page
appear to have any kind of roll up that shows whether the stack passes or
fails, or by how much margin." Baseline: `master` @ `3141e51`. Scope: this
session owns `apps/viewer/views/topology.js`, `apps/viewer/views/nav.js`,
`apps/viewer/topology.js` (render helpers), `scripts/build_topology_projection.py`
/ `scripts/build_viewer_projection.py` (gaps emission), and their tests. Do
NOT touch `apps/annotate/` (owned by `annotate_hosted_page_posture` /
`extracted_mesh_alias_rows`), the respine/tween machinery in
`topology_app.js` (owned by `respine_tween_fidelity_round2`), or the guard
tiers (owned by `mutation_witness_tier_repair` / `viewer_value_guard_rows_and_replays`).

## Context — the data already exists; nothing renders it

- `data/projections/viewer/topologies.json` carries a `checks` array per
  study (schema `joby.tolerance_stack/check_result/v0`) with `verdict`,
  `verdict_scope`, `complete`, `excluded_terms`, `worst_case_min/max`,
  `rss_*`, `guidance` — landed by `topology_projection_emits_study_checks`
  (2026-09-09). Live values: `pitch_link_shank_out` → **fail**,
  `pitch_link_cotter_hole_clearance` → **pass**, `pitch_link_thread_region_t`
  → `checks: []`. Across all five topologies: 13 studies carry a
  verdict-bearing check, 6 carry `checks: []`.
- **No viewer code reads `study.checks`** — grep across `apps/viewer/` finds
  only comments. `apps/viewer/views/topology.js:1127-1133` is a stale comment
  claiming the field "never reaches the projection at all"; that was true
  before 2026-09-09 and is false now.
- Verdicts currently render only in the classic stack view
  (`apps/viewer/views/stack.js:595-660`) — the asymmetry the "classic view"
  nav chip papers over. A follow-up handoff
  (`viewer_nav_wedge_and_classic_retirement`, depends on this one) removes
  those chips, so this handoff must leave the DAG page with **no verdict
  information the classic view had that the DAG page lacks**.
- Per-element `zero_width` flags, per-check `zero_width_inputs` and
  topology-level `zero_width_count` are already in the projection
  (`build_viewer_projection.py:528,551,583,630`).
- `build_topology_projection.py` emits **no `gaps` key at all** (verified);
  the stack-side gap derivation exists at `build_viewer_projection.py:290-352`
  (`stack_gaps`, kinds `excluded_from_model` + `hardware_entry`) but is
  rendered only by classic `stack.js`.

## Deliverables

1. **Verdict rollup on every study.** In the study totals strip
   (`VA.renderTopoTotals`, `views/topology.js:1134-1183`) and as a compact
   badge on the study's nav row: pass / fail / marginal with the margin
   number (worst-case distance to the criterion, signed, with units). A study
   with `checks: []` renders an explicit "no pass/fail criterion recorded
   yet" state — never a blank. A check with `complete: false` shows its
   verdict **visibly qualified**: state in plain words that terms are
   missing and name them from `excluded_terms` (e.g. "does not include the
   spherical bearing width — no source document yet"), because an
   unqualified verdict on an incomplete chain is the exact lie this repo
   exists to avoid.
2. **Unverified/incomplete is LOUD, at both levels** (Jeff, 2026-09-15
   follow-up, binding): any study whose chain contains an unverified,
   placeholder, or zero-width input — or whose check excludes terms —
   carries a prominent badge at the **study level** (totals strip AND nav
   row), and each affected **line item** carries its own badge in the grid.
   His words: the current design "omits them entirely and then fails
   silently which is worst of both worlds." Loud beats subtle here; the
   badge vocabulary is everyday words ("unverified", "incomplete", "no
   tolerance recorded"), styled to be impossible to miss at a glance.
3. **Lower-bound warning when zero-width inputs are present.** If a study's
   chain contains zero-width-band elements, the totals strip says so in
   everyday words: "N dimensions in this chain have no tolerance recorded —
   the worst-case spread shown is a lower bound." Name the affected rows.
4. **Gaps reach the DAG page.** Emit a gaps list for topologies in the viewer
   projection (reuse/extend the `stack_gaps` derivation; the covered stack's
   gaps are the right starting set) and render a "what's missing" panel on
   the topology page: excluded terms, untraced bands, absent source
   documents — each in plain words with what would close it.
5. **Fix the stale comment** at `views/topology.js:1127-1133` — it now states
   the opposite of the data contract.
6. **UI copy rules apply** (Jeff, standing): no internal field names
   (`excluded_terms`, `source_ref`), no file paths, no schema jargon in any
   rendered string. Plain words only.

## Definition of done

- On the live projection (rebuild via the documented script from the main
  checkout, `--data-root C:\workspace\tolstack\data`): the pitch-link
  topology shows `shank_out` **FAIL** with its margin, `cotter_hole_clearance`
  **PASS** with margin, `thread_region_t` "no criterion recorded"; the
  shank-out study shows the lower-bound warning naming the bushing and washer
  rows; the missing spherical-bearing exclusion is visible on the page
  without opening any JSON; every study with unverified/placeholder inputs
  or excluded terms is visibly badged at the study level AND on each
  affected line item.
- Value-level tests pin the rendered verdict/margin strings for the pitch-link
  studies and the `checks: []` and `complete: false` renderings; full suite
  green.
- Lesson (`docs/sessions/lessons/LESSONS_20260915_viewer_study_verdicts_and_gaps.md`):
  record what the gaps-emission change did to projection size/shape and any
  copy decisions a future session must not re-litigate.
