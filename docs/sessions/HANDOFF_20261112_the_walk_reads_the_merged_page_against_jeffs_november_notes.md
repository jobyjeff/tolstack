---
priority: high
depends_on: [a_part_may_contain_parts]
model: opus
hitl: false
---

# HANDOFF 2026-11-12 — the_walk_reads_the_merged_page_against_jeffs_november_notes: one session uses the merged page as Jeff would and hands him a review page, sentence by sentence

Source: Jeff, 2026-11-12, to the strategy session: the one-step-then-review
rhythm has had little for him to look at, so the steps are now chained and he
reviews once, "when there are significant new features to review". This handoff
is that review's preparation, and the stop before the DAG becomes a map. The
rule it serves (2026-11-08): three batches shipped broken because every session
looked at its own branch and nobody looked at the merged tree. Strategy record:
`dispatch/docs/strategy/HANDOFF_20261112_strategy.md`.

Baseline: `integration` with all six handoffs of the 2026-11-12 chain merged:
`a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown`,
`hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque`,
`a_part_links_to_its_drawing_before_it_has_a_tolerance`,
`a_feature_is_bound_once_to_a_set_of_faces`,
`the_page_is_a_fixed_layout_and_nothing_scrolls_the_document`,
`a_part_may_contain_parts`. Read all six lessons. Scope: `docs/sessions/lessons/`
(the review page and its shots), `docs/issues/`; **fixes of one or two lines
only**, each listed. Anything larger is filed, not fixed. Do NOT restyle,
refactor or re-litigate a decision the six handoffs state.

## What to do

1. **Rebuild the projections, then open the merged page** the way Jeff does: the
   viewer on drawing-checker's mount at `http://127.0.0.1:8000/`, the end-stop
   model (v2), at 3840×2160 and at 5120×2160. If 8000 is not serving, use the
   dev fallback on 8843 and say, at the top of the review page, what that could
   not show.
2. **Walk Jeff's sentences.** His notes are quoted in the six handoffs' Source
   lines and in full at
   `C:\workspace\forge\data\projections\notes.json` (ids
   `20261112T114449_f3anmp` and `20261109T222516_f7jdsi`; read-only). For each
   sentence that describes behaviour — every one, including the ones he called
   small — do what he did, and record what the page does now. Use the page as a
   person: hover, click, select from each of the four surfaces, bind a face
   **against a scratch copy of the log**, correct it, unbind it, reload, resize
   a seam, switch the three-way control, collapse an assembly.
3. **Then go past his sentences**: fifteen minutes of use with no script, and
   write down anything that looks wrong, slow, or surprising.
4. **Write the review page**:
   `docs/sessions/lessons/REVIEW_20261112_the_merged_page.md`, with its shots in
   `docs/sessions/lessons/shots/the_merged_page_20261112/`. One table: Jeff's
   sentence (short) · what the page does now · a shot · verdict in one word
   (`does it`, `partly`, `does not`). Above it, three lines: how many of each
   verdict, the three things most worth his time, and the one thing most
   broken. No other prose. Every shot is one you looked at; say what is in it,
   not what should be.
5. **File** each `partly` and `does not` as an issue with the shot, the
   handoff that owned it, and `audience: strategy` only where a decision is
   needed; the rest are ordinary defects for triage.

## Definition of done

- The review page exists, every behavioural sentence of the two notes has a row,
  and every row has a shot.
- The verdict counts are stated; no row reads `does it` on the strength of a
  test or a lesson — only on what the page did in this session.
- One- and two-line fixes made here are listed with their commits; the tiers the
  repo's table gives a tactical session were run for them.
- Lesson (`docs/sessions/lessons/LESSONS_20261112_the_walk_reads_the_merged_page_against_jeffs_november_notes.md`):
  how long the walk took; which defects a per-handoff look could not have seen;
  what the map handoff should know about the page it will be drawn into.
