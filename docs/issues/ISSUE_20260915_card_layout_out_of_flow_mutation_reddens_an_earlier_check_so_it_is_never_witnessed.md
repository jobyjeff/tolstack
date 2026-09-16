---
type: bug
priority: med
status: resolved
resolution: fixed 2026-09-16 by handoff `mutation_witness_tier_reaches_its_checks` -- `hoverIgnoringOcclusion` in the browser runner; the mutation is unchanged and the entry is witnessed by name. This filing carries the shared disposition for all three card-layout issues.
area: tests/mutation-witness
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_value_guard_rows_and_replays.md
handoff: docs/sessions/HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md
---

# `card-layout-out-of-flow` goes red on the wrong check, so the mutation tier reports 17/18 forever

> **Duplicate — added in review, 2026-09-15
> (`review/viewer_value_guard_rows_and_replays`).** Filed independently the
> same day as
> `ISSUE_20260915_the_card_layout_out_of_flow_mutation_witness_stopped_witnessing_on_integration.md`
> (`viewer_component_names_and_reference_copy`), which reports the same
> `NOT WITNESSED: card-layout-out-of-flow` against a larger tier (21/22, after
> that handoff declared four more mutations). Reproduced here in review with
> `--only card-layout`. Cross-referenced rather than deleted: this filing is
> the one that names the **mechanism** — the mutation breaks the page badly
> enough that a hover times out upstream of the declared sub-check, so the
> tier goes red on the wrong thing. Dispose of both together.

Found as the **baseline** state of this branch. `scripts/run_mutation_witness_tests.mjs`
was out of this handoff's scope; it is filed rather than fixed.

```
node scripts/run_mutation_witness_tests.mjs --repo C:\workspace\tolstack --only card-layout-out-of-flow

  clean run of browser / topology file://... green
  mutated run... NOT WITNESSED — the tier went red, but not on the declared check.
    | FAILED: topology file://

0/1 declared mutations witnessed
```

The full tier reports **17/18 declared mutations witnessed**, this being the
one. **Reproduced identically at this branch's base (`9349f6d`)** by checking
out `apps/` at that commit and re-running, so it is not introduced by the work
on this branch.

## What actually happens

The mutation flips `apps/viewer/style.css`'s hover-card rule from
`position: fixed` to `position: absolute`. The declared witness is a scrolled
card-placement check (`CARD_SCROLL_VIEWPORT`), but the suite never reaches it:
an **earlier** sub-check in `topology file://` hangs first, with Playwright
retrying a hover for the full timeout —

```
<img class="croppop__img" …/> from <div id="croppop" class="croppop hovercard hovercard--edge">…</div>
subtree intercepts pointer events
- retrying hover action
```

An absolutely-positioned card is laid out in the document's frame, so with the
page scrolled it lands over the trigger the next sub-check wants to hover, and
that sub-check times out. The tier is strict — and rightly so — that a mutation
must redden **its own** declared check, because a mutation that reddens
something else proves nothing about the guard it names.

So this is not the guard being toothless. It is the mutation being **too
broad** to isolate the guard: it breaks the page badly enough that the suite
dies upstream of the check it was written for. Third entry in the same lineage
(`ISSUE_20260911_card_layout_guard_passes_on_the_absolute_popover.md`,
`ISSUE_20260914_card_layout_guard_cannot_see_the_absolute_popover_again.md`),
which is itself the finding: this one contract has now cost three rounds of
witness repair, and each round moved the witness rather than asking whether
`position` is the right thing to mutate.

## Fix shape, and the decision inside it

Two honest options, and they are not equivalent:

1. **Narrow the mutation** so it isolates the contract — e.g. mutate only the
   coordinate basis the card placement reads, rather than the CSS property the
   whole page's pointer behaviour hangs off. Keeps the entry meaningful.
2. **Order the suite** so the declared check runs before whatever hover now
   times out. Cheapest, and the most fragile: it re-breaks the next time a
   sub-check is added above it, which is close to what happened twice already.

Worth pairing with
`ISSUE_20260915_expect_red_is_the_half_of_a_mutation_entry_nothing_cheap_checks.md`
— "the tier went red, but not on the declared check" is exactly the state that
issue is about, and a fix for one probably wants to know about the other.

## Resolved 2026-09-16 -- `mutation_witness_tier_reaches_its_checks`

`card-layout-out-of-flow` is WITNESSED, against the `expect_red` it already
declared, with the mutation **unchanged**: `.croppop` still flips
`position: fixed` to `position: absolute`, and the entry still guarantees
exactly the fixed-vs-absolute contract it is named for. Nothing was retired and
nothing was narrowed.

```
--- card-layout-out-of-flow
  clean run of browser / topology file://... green
  mutated run... WITNESSED
  apps/viewer/style.css: display: none; position: fixed; z-index: 20; width: 540px;
  reddens: an open card is placed in the WINDOW's frame, not the document's - it still sits against its trigger with the page scrolled
```

**All three filings are this one defect, and none of them had the mechanism
right.** The hover that timed out was neither the "one edge, two triggers, ONE
card" hover ~56 lines *after* the declared check nor anything ~150 lines
*before* it: it was **the declared check's own hover**, one line above it. The
declared check was never reached, so there was never a name to print.

What made that measurable was fixing the *reporting* first: a suite that throws
now prints the failures it had already collected, and its abort line says how
many sub-checks ran. Under the mutation that line read
`ABORTED after 22 sub-checks, 0 of them already FAILED` -- and the declared
check is sub-check 23. One run, no bisecting.

**Why the hover could not complete.** Under `absolute` with the document
scrolled, the card is placed `scrollY` px up-document from where it belongs,
which puts it **on top of the trigger it was opened from** (the 148px the entry
was measured at is signed: the card overlaps the trigger, it does not sit
further from it). `locator.hover()` will not act on an occluded element -- the
first hover opens the card, the card occludes the trigger, and every retry from
then on sees the occlusion and backs off until the 30-second timeout. So the
harness, not the guard, was what declined to look at the defect.

**The fix.** `hoverIgnoringOcclusion` in `scripts/run_viewer_browser_tests.mjs`
drives the pointer to the trigger's own coordinates with `page.mouse.move`,
which performs no actionability check -- the escape hatch `hoverRailBar` next
door already takes for a different playwright limitation. Issue 1 argued
against dismissing the card defensively because *a card intercepting pointer
events is the defect*; this keeps that, and moves the concession into the
harness, where it belongs.

Not taken, and no longer needed: moving the declared check earlier, declaring a
narrower mutation, splitting the suite. Nothing teaches the runner to accept a
bare `ERROR` as red -- that fence held.

**One thing found on the way.** The reading was never taken at the scroll the
tripwire above it certified: `locator.hover()` was silently scrolling the
trigger into view first (at `CARD_SCROLL_VIEWPORT` scrolled to the document's
end the trigger sits *above* the window -- measured scrollY 175). There is now a
second tripwire on the scroll the measurement is actually taken at.

Full detail, including the before/after runs and the fourteen discarded-failure
sites: `docs/sessions/lessons/LESSONS_20260916_mutation_witness_tier_reaches_its_checks.md`.
