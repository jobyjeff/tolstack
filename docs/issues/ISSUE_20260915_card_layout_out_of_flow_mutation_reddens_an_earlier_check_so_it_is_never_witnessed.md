---
type: bug
priority: med
status: triaged
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
