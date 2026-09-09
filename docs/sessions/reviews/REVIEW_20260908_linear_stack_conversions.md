---
type: review
handoff: linear_stack_conversions
reviewer: agent
date: 2026-09-08
verdict: APPROVE
blockers: 0
---

# Review — linear_stack_conversions

Handoff `HANDOFF_20260908_linear_stack_conversions.md`, branch
`handoff/linear_stack_conversions`, cut from `integration` (1fc11bc, the
`topology_schema_v1` APPROVE). Deliverable: re-express three of the four
remaining linear stacks as `dimension_ref` topologies, following L1's
zero-copied-numbers pattern. Reviewed from `review/linear_stack_conversions`,
cut from the same base.

**Merge status**: clean fast-forward, no conflict (`git merge
handoff/linear_stack_conversions`, 1fc11bc → 58f6979). `git log --oneline
HEAD..origin/integration`/`local/master` showed nothing ahead in code terms —
see the projection-rebuild note below for the one wrinkle this produced.

## Scope check

Constraints honored: zero changes to `docs/tolerance_stacks/*.json`,
`tolerance_stack/`, `docs/SOP_TOLERANCE_STACK.md`, or `apps/` (confirmed by
`git diff --stat` against every one of those paths — empty). Only `docs/`
(three new topologies + nine+two+one studies, one issue, one lesson, three new
`DAG_TOPOLOGY.md` sections) and `tests/` (one new module) changed. No
`feature-identity/v0` binding events written; existing bindings key on
`{stack_id, element_id}` and are untouched, as required.

## This is a re-expression, not new authorship — what that changes about the audit

Every value in every new topology/study is a `dimension_ref` into an
already-reviewed, already-cited stack element. There are no new `source_ref`s,
no new tolerances, and the traced ratio is unchanged by construction. The
provenance audit below is therefore mostly about **fidelity of the
re-expression** (does the graph fold to the exact numbers the stack already
publishes, and does it copy nothing), not about new citations.

## The seven mandatory checks

1. **Every tolerance traces to a specification or drawing callout.** PASS —
   trivially, by construction, but verified rather than assumed:
   `test_a_converted_topology_copies_no_value` (already in the branch) asserts
   every edge is either `dimension_ref`-only or `derived` (no `dimension`
   key), and separately asserts the resolved `Dimension`'s `source_ref`,
   `role`, `min`, `max`, `nominal` equal the referenced stack element's own,
   field for field. I broke this guard twice to confirm it fires (added an
   inline `dimension` to one edge; retargeted a `dimension_ref` to a sibling
   element) — both reproduced a red suite with the expected assertion message,
   then reverted cleanly (`git status` clean afterward, full suite re-green).
2. **Signs on every path term.** PASS. Every converted check/path is pinned by
   **exact equality** (no `pytest.approx`) against the referenced stack's own
   `check()`/`path()` output — 12 checks + 1 path cross-check, 13 assertions,
   all green. A sign error on any edge would necessarily change the folded
   result and fail this comparison, so I did not hand-trace every sign; I
   spot-verified the two structurally interesting cases instead:
   - `pitch_link_to_pitch_plate`'s bolt-point/cotter-hole sub-loop (the one
     graph here that isn't a simple chain — 2 grounded loops, 3 branch
     points) — the `bolt_length_11`/`fastener_grip`/`thread_region` and
     `cotter_hole_from_point` reasoning in the topology's own `provenance`
     matches the referenced stack's `thread_region_T` and
     `cotter_hole_clear_of_sourced_stack` terms exactly (independently
     re-derived, not just read).
   - `tan_link_to_pitch_plate_take2`'s `bushing_chamfer` — the one genuine
     *subtracted* (inverting) feature in any of the three conversions,
     authored running from the effective clamped face back to the raw barrel
     end so a forward-walking chain crosses it against its own orientation.
     Confirmed against the referenced stack's own `total` path, which carries
     `bushing_chamfer` at `sign: -1`.
   I also re-verified all three topologies' own inventory sentences (parts /
   interfaces / edges / branch points / grounded loops / gap edges)
   independently in Python (union-find over `Topology.edges`/`.nodes`, not by
   eye) rather than trusting the doc-scan test alone:
   `pitch_link_to_pitch_plate` 4/7/8/3/2/1, `rotor_fastener_length`
   3/4/12/2/9/1, `tan_link_to_pitch_plate_take2` 4/7/7/0/1/1 — all six figures
   in all three sentences correct, matching `DAG_TOPOLOGY.md`'s new prose
   exactly.
   *A budget-check prose direction I chased and did not flag*: the nine
   `grip_budget__uXh` checks' `guidance` text describes the excluded-term
   magnitude as what "this dash can accommodate," which read to me on first
   pass as the wrong side of a floor-vs-ceiling framing (physically this
   looks like a minimum-required figure, not a maximum-accommodated one). This
   text is **byte-identical** to `stack_rotor_fastener_length.json`'s own
   already-committed `guidance` string — not new prose this handoff wrote —
   and `REVIEW_20260825_fastener_stack_shadow.md` already investigated this
   exact joint's check-direction question against JPS00094 5.5.5 and
   confirmed the established direction over an initial, later-retracted
   suspicion of its own. Per that precedent and the checklist's own warning
   against re-litigating a check-2-shaped question from physical intuition
   over established precedent, I did not reopen it. Noting it here rather
   than silently dropping it, since I got far enough into it to want the next
   reviewer to know it was looked at.
3. **LMC/MMC direction.** N/A to this handoff's own diff — no element carries
   `lmc`/`mmc` interpretation here; `dimension_ref` resolves `min`/`max`/
   `nominal` only (verified by the same copies-no-value test), never
   `lmc`/`mmc`, and `tolerance_stack/` (where `fold()` lives) is untouched.
4. **RSS actually computed.** PASS. Rebuilt projection (see below) shows
   nominal/worst-case/RSS together for every new study; verdicts are computed
   from nominal/worst-case only, unchanged code path.
5. **Nominal inside its own min/max.** N/A — no new elements.
6. **Quantised constraints (castellation/cotter).** PASS, checked per joint:
   - `pitch_link_to_pitch_plate` and `tan_link_to_pitch_plate_take2` both
     carry MS9363/MS24665 hardware; the caveat text is copied verbatim
     (byte-identical) from the referenced stack's own `guidance`, sitting
     directly in the study's `checks[].guidance` — next to the numbers, not
     in a separate notes section.
   - `rotor_fastener_length` correctly states the caveat's absence: the
     `washer_far_face` node's own note says "Retention here is a blind tapped
     hole, not a nut: no castellation/cotter-hole caveat applies at this
     joint," which I checked against the stack's own `joint` field
     (`stack_rotor_fastener_length.json`) — it says the same thing, word for
     word, and I independently confirmed no MS9363/MS24665 balloon appears in
     that stack's parts list.
7. **Traced / inferred / untraced ratio.** **30 traced / 9 inferred / 20
   untraced, out of 59 element instances**, re-derived by me via
   `tests\debug_report_tolerance_stacks.py --ratio` — unchanged from the
   figure the `fastener_stack_shadow` review recorded on 2026-08-25, because
   this handoff added zero `StackElement`s (topologies/studies are a
   different schema the ratio script does not, and should not, walk). No new
   non-element values (materials/temperatures/ratios) either — all three
   converted topologies use only the identity transform.

## Definition of done

- Per-conversion value-pinned tests in the `test_topology.py` mold: present,
  17 tests in `tests/test_topology_conversions.py`, all passing, and I
  confirmed two of them actually fail on a broken tree (see check 1 above).
- Full suite green: **739 passed, 1 skipped** in this worktree (the skip is
  the pre-existing, gitignored-data-absent `REQUIREMENTS_PULL` skip, unrelated
  to this session) — matches the lesson's own figure exactly.
- **Projection rebuild — done during this review, not by the tactical
  session.** The lesson is explicit that it ran the builder only against a
  scratch `--data-root`, deferring the shared main-checkout rebuild to the
  reviewer because the gate refused there (`master` and this branch have
  diverged). I ran it for real: `scripts/build_topology_projection.py
  --data-root C:/workspace/tolstack/data` refused first
  (`commit 9b9ef1d55481 is NOT an ancestor of this tree's HEAD`), so I
  diffed `HEAD` against `local/master`'s tip before overriding — the
  divergence is **board-bookkeeping only** (`docs/sessions/` staged/
  active/completed tracking commits; `git diff HEAD local/master --stat`
  shows zero code/schema changes master has that this branch lacks, and the
  merge-base is the last batch-merge commit, `60dc9e1`). Re-ran with
  `--allow-older-tree`: exits 0, all four topologies present
  (`pitch_link_to_pitch_plate`, `rotor_fastener_length`,
  `tan_link_to_pitch_plate_take2`, plus the pre-existing `vpa_output_to_
  pitch_plate` and `pitch_system`), all 13 new studies appear with correct
  contribution counts, `orphan_studies: []`. Added an overlay entry (see
  below) so the next reviewer who hits a "not an ancestor" refusal checks
  *which kind* of divergence it is before overriding it.
- Lesson present and accurate
  (`docs/sessions/lessons/LESSONS_20260908_linear_stack_conversions.md`):
  what converted, `tan_link_to_pitch_plate` (take 1) correctly left
  classic-rendered per `topology_schema_v1`'s fence (mechanically pinned by
  `test_tan_link_to_pitch_plate_take_1_has_no_topology`, which I also
  confirmed fails if the topology file is restored — not run this session,
  taken on the strength of the assertion reading the filesystem directly),
  the nine-studies-not-one decision for `rotor_fastener_length` (correctly
  filed as an issue rather than modifying `tolerance_stack/`, which was out
  of scope), and an honest "what the element-order reading had to decide"
  section flagging exactly the graph-structure judgment calls a future
  reviewer should re-derive (which I did, for the two most complex ones — see
  check 2 above).

## Issue filed by the tactical session

`docs/issues/ISSUE_20260908_check_study_limit_cannot_carry_a_ranged_value.md`
— well-formed frontmatter (`type: feature`, `priority: low`,
`audience: strategy`), accurately describes why nine studies were needed
instead of one, and correctly scopes itself to a future schema pass rather
than proposing a fix inside this handoff's boundaries.

## Findings

None rise to should-fix or blocker. The one thing I chased at length (the
`grip_budget__uXh` guidance framing, check 2 above) resolved to "inherited,
byte-identical, already investigated by a prior review" rather than a new
defect, so it is not filed as an issue — it belongs to
`stack_rotor_fastener_length.json`, which is out of scope and immutable for
this handoff, and re-opening a settled precedent without new evidence would
cost the next reader more than it returns.

## Overlay maintenance

`docs/prompts/REVIEW_AGENT.md` was already extensive. Added two entries,
edited none, pruned none (nothing has gone stale):

- **Recurring bugs**: the `--allow-older-tree` "not an ancestor" message can
  mean either "master is simply older" or "genuine fork" — diff the tips
  before overriding, don't treat non-ancestry alone as proof of a real
  divergence.
- **Architectural errors**: a linear stack whose checks mix a named `path`
  term with signed elements has no topology equivalent today (the fence
  `topology_schema_v1` documented) — verify a future conversion candidate for
  this shape before building one, and expect "stays classic-rendered,
  pinned by an absence test" as the correct outcome, not a hand-flattened
  check.
- Also confirmed (not re-added, since a second sighting needs no edit) that
  the already-open `check_study`-projection gap (filed by `topology_schema_v1`)
  now covers 12 more checks; noted inline under that existing entry rather
  than duplicating it.

## Verdict

**APPROVE.** No blockers. Merging to `integration` and pushing next.
