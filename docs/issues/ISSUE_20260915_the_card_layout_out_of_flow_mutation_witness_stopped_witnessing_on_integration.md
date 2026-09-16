---
type: bug
priority: med
status: resolved
resolution: fixed 2026-09-16 by handoff `mutation_witness_tier_reaches_its_checks`; one defect with two sibling filings -- disposition written on ISSUE_20260915_card_layout_out_of_flow_mutation_reddens_an_earlier_check_so_it_is_never_witnessed.
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_component_names_and_reference_copy.md
handoff: docs/sessions/HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md
---

# `card-layout-out-of-flow` stopped witnessing somewhere on `integration`, and the mutation tier is 21/22

`node scripts/run_mutation_witness_tests.mjs` reports

```
NOT WITNESSED: card-layout-out-of-flow
```

The declared mutation (`.croppop` back to `position: absolute`, `apps/viewer/style.css`)
no longer reddens its declared sub-check — *"an open card is placed in the WINDOW's
frame, not the document's — it still sits against its trigger with the page
scrolled"*. The suite does go red, but as

```
[topology file://] ERROR: locator.hover: Timeout 30000ms exceeded.
  - waiting for locator('tr.tvrow[data-id=\'base_thickness\'] button.crop-trigger')
```

i.e. an open absolute popover intercepts the pointer on the *next* hover and the
run aborts **before** the declared check is reached. A symptom with no name
attached is not a guard, and this is the third sighting of exactly that tell on
this block (see the overlay entry "A fix that makes the app *more* correct can
make the guards already in that block vacuous").

## Not this handoff's — measured both ways

Replayed with `git archive <rev> | tar -x` into a scratch tree with
`node_modules` and a built projection copied in, then
`node scripts/run_mutation_witness_tests.mjs --repo <scratch> --only card-layout`:

| tree | result |
|---|---|
| `473106e` (merge-base of `integration` and `handoff/viewer_component_names_and_reference_copy`) | WITNESSED |
| `handoff/viewer_component_names_and_reference_copy` (0b898da) | WITNESSED |
| `f629942` (integration, before `pitch_link_known_bands` landed) | WITNESSED |
| `0573826` (`pitch_link_known_bands` reviewed and APPROVEd) | WITNESSED |
| **`afcbbb4`** (`Merge branch 'integration' into review/pitch_link_known_bands`) | **NOT WITNESSED** |
| `2559539`, `integration` tip | NOT WITNESSED |

So the breakage entered at `afcbbb4` — the merge that brought
`viewer_study_verdicts_and_gaps`, `respine_tween_fidelity_round2` and
`annotate_hosted_page_posture` onto that line. None of those three sessions could
see it: each was green in its own tree, and the mutation tier only fails once the
two sides are together. It rode onto `integration` inside a *review* merge, which
is the one place nobody re-runs the mutation tier.

## What to do

Either repair the witness so the declared sub-check is reached (e.g. dismiss the
open card before the next hover, or measure the scrolled claim before the
block that now leaves one open), or retire the entry and say why. Do **not**
"fix" it by accepting the `ERROR` as red: the runner already distinguishes
*red on the declared check* from *red somewhere*, and that distinction is the
whole point of the tier.

Worth considering separately: a review agent's own integration merge should
re-run `run_mutation_witness_tests.mjs`, not only the three behaviour tiers.
This defect is invisible to every one of them.

## Resolved 2026-09-16 -- `mutation_witness_tier_reaches_its_checks`

Fixed. One defect, filed independently by three sessions on 2026-09-15; the
disposition is written once, on
`ISSUE_20260915_card_layout_out_of_flow_mutation_reddens_an_earlier_check_so_it_is_never_witnessed`.

In short: `card-layout-out-of-flow` is WITNESSED by name with the mutation
unchanged. The timing-out hover was **the declared check's own hover**, one
line above it -- not the later "one edge, two triggers, ONE card" hover and not
anything 150 lines earlier, so the declared check was never reached at all.
Under `absolute` the mispositioned card lands **on** its trigger, and
`locator.hover()` refuses to act on an occluded element;
`hoverIgnoringOcclusion` drives the pointer there directly instead.

This filing's own contributions to the fix, which the others did not carry:

- it bisected **when** the regression entered (`afcbbb4`, a review merge of
  three branches each of which was green alone), which is the evidence that it
  rode in through the one merge nobody re-runs this tier on;
- it drew the hard fence the fix is built inside: do **not** teach the runner to
  accept a bare `ERROR` as red, because *red on the declared check* against *red
  somewhere* is the entire value of the tier. Nothing in the fix touches that --
  a suite that aborts before its first `push` still prints no names and is still
  reported as unattributable.

Its remaining suggestion is **not** done and is not this repo's to do: a review
agent's own integration merge should re-run `run_mutation_witness_tests.mjs`
and not only the three behaviour tiers. That is a dispatch/review-prompt
change, and it now has its own filing --
`ISSUE_20260916_a_review_merge_is_the_one_place_the_mutation_tier_is_never_re_run.md`.
