---
type: bug
priority: med
status: resolved
resolution: fixed 2026-09-16 by handoff `mutation_witness_tier_reaches_its_checks`; one defect with two sibling filings -- disposition written on ISSUE_20260915_card_layout_out_of_flow_mutation_reddens_an_earlier_check_so_it_is_never_witnessed.
area: viewer/mutation-witness
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_respine_whole_walk.md
handoff: docs/sessions/HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md
---

# `card-layout-out-of-flow` is NOT WITNESSED again — its mutation aborts the suite 150 lines before the check it declares

`node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack`
reports **17/18**, with `card-layout-out-of-flow` missed. This is not the
2026-09-14 failure that
`ISSUE_20260914_card_layout_guard_cannot_see_the_absolute_popover_again.md`
describes and `guard_mutation_witness_tier` fixed (that one was "the witness
cannot see the difference"); this one is "the tier never reaches the witness".

## Measured

Pre-existing on the branch base, not introduced by the session that found it:
run at `9517ce0~2` (= `integration` @ `2dbd3d7`), with `apps/` and `scripts/`
extracted by `git archive` into a scratch tree and the runner invoked from
there, the entry is missed with the identical trace.

```
node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only card-layout

[topology file://] ERROR: locator.hover: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('tr.tvrow[data-id=\'base_thickness\'] button.crop-trigger')
    - locator resolved to <button class="crop-trigger crop-trigger--resolved ...">
    - <img class="croppop__img" ...> from <div id="croppop" class="croppop hovercard hovercard--edge"> subtree intercepts pointer events
    - retrying hover action
    ...56 ×
```

## What is happening

The mutation swaps `#croppop`'s `position: fixed` for `position: absolute`
(`apps/viewer/style.css`). The suite is at `CARD_SCROLL_VIEWPORT`
(1600×560) with the document scrolled, so an `absolute` card is laid out in
the *document's* frame and lands somewhere the viewport does not expect —
specifically, on top of the next trigger. The suite's "one edge, two triggers,
ONE card" check (`scripts/run_viewer_browser_tests.mjs`, the
`tr.tvrow[data-id='base_thickness'] button.crop-trigger` hover) then cannot
reach its own button, times out at 30s, and the whole `topology file://` suite
ERRORs.

The declared `expect_red` ("an open card is placed in the WINDOW's frame, not
the document's — it still sits against its trigger with the page scrolled")
sits ~150 lines further down and is never printed. The runner can only
attribute a **named** failure, so an aborted suite is a miss, exactly as its
own message says: *"a mutation that breaks the page itself, rather than one
behaviour, aborts its suite; this tier can only attribute a NAMED failure, so
declare a narrower mutation."*

## Why it matters

The entry is the only thing standing behind the out-of-flow contract, and a
`NOT WITNESSED` line is indistinguishable at a glance from the tier being
broken. It also makes the whole tier permanently non-green, which is the state
in which a *real* regression in one of the other 17 stops being noticeable.

## Ways out, none of them obviously right

- **Dismiss defensively.** Have `dismissCard()` (or the trigger hover) tolerate
  a card that refuses to go away — but a card intercepting pointer events IS
  the defect, and papering over it in the harness weakens every card check.
- **Move the declared check earlier**, before the first crop-trigger hover, so
  the mutation reddens something the runner can name before the abort. Cheapest,
  and it keeps the contract where it is.
- **Declare a narrower mutation** that only reaches the card-layout check —
  e.g. mutate the `top`/`left` the card is positioned at rather than its
  `position`. Weaker: it no longer witnesses the fixed-vs-absolute claim the
  entry is named for.
- **Split the suite** so a hover timeout cannot take the whole file down. Largest,
  and it touches every other entry that names `topology file://`.

The third option changes what is guaranteed, so this wants a decision rather
than a patch.

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

- it established the failure was **pre-existing on the branch base**, not
  introduced by the session that found it, which is what let triage treat the
  three filings as one thing;
- it argued against dismissing the card defensively in the harness, because a
  card intercepting pointer events *is* the defect. That argument was right and
  is what the fix respects: nothing dismisses anything, and the concession is
  made in how the pointer is driven rather than in what the page is allowed to
  do.
