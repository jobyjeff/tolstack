---
type: review
handoff: docs/sessions/active/HANDOFF_20260915_respine_tween_fidelity_round2.md
reviewer: agent
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# Review — respine_tween_fidelity_round2

All three deliverables are met, every new guard was observed failing on the
mutation that describes the pre-fix behaviour, and both tiers are green. One
should-fix — a **fourth** copy of the claim the handoff told the author to make
true — was fixed inline and is recorded below and in this repo's overlay.

## What I verified

**The merge.** `handoff/respine_tween_fidelity_round2` was not contained in
`integration` (`git merge-base --is-ancestor` → not merged), so the merge was
real and the verification below is not retrospective. It merged clean, with no
conflicts and nothing to resolve.

**The fix is right at the measured numbers.** Re-derived off the shipped
functions rather than from the lesson's prose. `VA.respineX` now returns the
*undecayed* shortfall plus `floor` (the outgoing frame's leftmost drawn column
index) and `t`, and `VA.drawnColumn` lerps each column between
`max(floor, column − columnShift)` and `column`. Frame A (select walk → chain,
`e = 0.5`) draws the chain's one rail at drawn index 4.5 → `x = 105` and
records `floor = 4.5`; the interrupting deselect's `e = 0` frame then draws all
ten of the walk's rails at `max(4.5, c − 4.5) = 4.5` → `x = 105`, i.e. on top of
the one rail frame A drew. That is the lesson's before/after table exactly.
At `t = 0` and `t = 1` the new expression reduces to the old one with
`floor = 0`, so nothing about a settled respine moved. `columnShift`'s changed
semantics (it no longer decays) has exactly one consumer — `VA.drawnColumn`,
reached from `columnX`, which every geometry site goes through — so there is one
place a drawn column index is computed, which is this repo's own "one `fold()`"
shape.

**Monotonicity, which is the property the first cut got wrong.** `drawnColumn`
is linear in `t` per column, so monotone by construction, and linear (hence
monotone) in `column`, which is what makes `drawnColumn(0, x)` genuinely the
*leftmost* drawn index rather than merely column 0's. The lesson's account of
why the moving-clamp version traced a **V** is correct, and the existing
monotonicity guard does catch it.

**The link fade.** `VA.linkOpacity` is `prev + (1 − prev)·t` off a map captured
once at the start of the transition (`ctx.tween.links` is fixed for the flight),
so it is a straight lerp from the interrupted alpha to 1 — continuous across an
interrupt, and the identity (all 1) with no `from`. A link the incoming frame
*drops* is covered by the pre-existing `.tv__ghost` cross-fade, the same as a
dropped rail, so the asymmetry is correct rather than a gap.

**`VA.linkKey` against the real corpus, not just the fixture.** Ran the key
construction over all 5 committed topologies' walk layouts
(`data/projections/viewer/topologies.json`, main checkout): 4 / 13 / 18 / 2 / 2
links, **zero duplicate keys and zero null tails**. The branch-landing case the
key exists for is pinned by a literal expected-string assertion, which is what
makes it a real collision test rather than a round-trip.

**The corpus claims in the code comments, the README and the lesson.**
Re-derived from the projection: **21** study chains across **5** topologies, all
with `layout.columns == 1` and `links: []`; walks run **2–10** columns and
**2–18** links. Every restatement of those numbers on the branch is correct.
(The previous round's review found "22 study chains" written for 21 — that has
not recurred.)

**Every new guard observed failing.** All four `mutation_witnesses.json` entries
run as `WITNESSED`, each reddening the declared sub-check and no other:

| entry | tier | result |
| --- | --- | --- |
| `respine-unfolds-out-of-the-rail-it-interrupted` | fast | WITNESSED |
| `a-link-a-respine-adds-fades-in` | fast | WITNESSED |
| `the-view-puts-a-links-fade-on-the-path` | fast | WITNESSED |
| `sticky-rails-hold-a-scrolled-dag` | browser | WITNESSED |

The first is the pre-fix behaviour exactly (`floor: 0`), which meets the
handoff's "demonstrate it failing before the fix" by construction and
re-runnably, rather than as a number quoted in a lesson. The second and third
split the number from the wiring, which is the right shape for a guard that
could otherwise stay green while the view stopped reading the value.

**The tiers.**

- `pytest -q`: **1 failed, 884 passed, 1 skipped** — identical, test for test,
  to `integration` at `f629942` (verified in a pre-work tree). The one failure is
  `test_every_byte_identity_claim_in_a_live_file_names_its_verification` against
  a triage-authored strategy brief; already filed twice by other reviewers
  (`ISSUE_20260915_byte_for_byte_claim_in_a_strategy_brief_reddens_pytest_on_integration.md`,
  `ISSUE_20260915_byte_identity_guard_reds_the_suite_on_a_triage_authored_brief.md`),
  so no third issue.
- Fast tier, no `--repo`: **302/302**.
- Fast tier, `--repo C:/workspace/tolstack`: **362/364**, the two reds being the
  `fixtures.js` / `topology_fixtures.js` projection drift the lesson names —
  reproduced identically on `integration` (358/360, the same two), so they belong
  to `viewer_study_verdicts_and_gaps` and its neighbour. Net **+4 passing**,
  which is the four new fixture-tier checks.
- Browser tier, full run with `--repo`: **19/19 suites**, `topology file://
  respine` **39/39**. It printed, on the real `pitch_system`:

  ```
  sticky holds to scrollLeft 553 of 605; at the far end the DAG is -41.5px from the pane's left edge
  scrolled respine: scrollLeft 605 -> 0 -> 0 (pane content 1474 -> 1240px)
  ```

  which is the lesson's and both issues' numbers verbatim. I checked their
  internal consistency too: `869 − 316 = 553`, `1474 − 869 = 605`, and the
  `−41.5` is `553 − 605 = −52` plus the 10.5px inset of the leftmost drawn box
  (`circle.rail__dot` at `cx = 15`, `r = 4.5`) — the two figures in that issue
  which look like they disagree do not.

**The fences held.** `apps/annotate/` untouched; `apps/viewer/topology.css`
untouched (the sticky finding is filed, not fixed, and the mutation that
witnesses it is applied to the shadow tree); the `VALUE_GUARDS` tables in
`apps/viewer/tests.js` and the hover-card sections of `apps/viewer/README.md`
untouched. The `pitch_system` subject the DoD names is the browser arm's actual
subject (`walkRow = navRow("topology", "pitch_system")`).

**Both filed issues carry correct frontmatter**, including `found_by:` and not
`handoff:` — the contract's most commonly missed field, and it is right here.

## Findings

### should-fix — fixed inline

1. **`apps/viewer/views/topology.js:219` — a fourth copy of the claim, left
   unconditional.** The handoff named three sites justifying "a rail needs no
   fade" and made "all three end up stating what the code guarantees" the
   definition of done. All three were rewritten correctly. But
   `renderTopoPane`'s own `xTween` comment — in a file on the handoff's own
   list, twenty lines above the call it documents — still read *"a column this
   respine ADDS unfolds out of **the spine** rather than sliding in from a place
   it never was"*. After this fix that is not merely conditional, it is wrong:
   the fold point is the outgoing frame's **leftmost** rail, which is the spine
   only in the settled-1-column-chain case the round-1 claim was written from.
   **Fixed inline** (comment only — no behaviour, no new test, seven lines): it
   now reads *"every column's drawn index interpolated (`VA.drawnColumn`) …
   unfolds out of the OUTGOING FRAME'S LEFTMOST RAIL — `from.floor`, not drawn
   column 0"*. Recorded as a new entry in this repo's overlay, since the
   generative shape — *a handoff enumerated the sites, and the author read the
   enumeration as closed* — is new here.

### nits

2. **`apps/viewer/tests.js`, `drewX` restates the render's own recording.** The
   synthetic helper hand-copies `VA.drawnColumn(layout.columns − 1, x) + 1` and
   `VA.drawnColumn(0, x)` from `renderTopoPane`'s `VA.lastTopoRender` literal,
   with nothing pairing the two. If the recording changes shape, the synthetic
   interrupt check goes on passing against a stale copy. Mitigated — the
   fixture-tier interrupt check at the end of the same block drives the real
   `VA.lastTopoRender` — so this is a nit and not an issue, but it is this
   repo's most-repeated defect shape wearing a different hat.

3. **`paneBoxes(false)` in `scripts/run_viewer_browser_tests.mjs`.** The
   settled-after call passes `false` to mean "don't scroll", which works only
   because it matches none of the three `target` branches; `paneBoxes()` is what
   the signature's own `where === undefined ? null : where` was written for.

4. **The tactical agent edited `docs/prompts/REVIEW_AGENT.md`.** The canonical
   process makes the overlay the *reviewer's* artifact. The six lines added are
   accurate (I checked the "four numbers now instead of two" claim —
   `columnShift`, `floor`, `t`, `width`, so four) and the "note what did not
   shrink" observation is a good one, so I kept them. Flagged so it does not
   become a habit: an author marking their own checklist entry "fixed" is the
   author grading the entry that was written about them.

5. **`VA.linkKey`'s cross-serialisation stability is pinned by literal key
   strings, not by two genuinely different serialisations.** The synthetic
   `open` / `closed` pair share the same `rows` array, so a column-indexed key
   would pass that check; what actually forbids one is the exact-string
   assertion in the branch-keying test. That is enough today, and it is worth
   the next reviewer knowing where the load sits, because the day a re-columned
   walk arrives (`ISSUE_20260915_respine_shows_the_chain_rather_than_recolumning_the_whole_walk`)
   is the day the key's real job starts.

## For the next reviewer

- The lesson is unusually good and its numbers all check out — I re-derived
  every count and every measured figure in it and found no drift. The thing to
  carry forward is its "Still to do" note: when the re-columned walk lands, the
  synthetic link-fade pair should be **joined** by a real one, not replaced.
- `integration` is red on one pytest check that has nothing to do with the
  viewer. Two issues already track it; don't file a third, and don't read it as
  this branch's.
- Running any of this from a worktree needs
  `cmd /c mklink /J <worktree>\node_modules C:\workspace\tolstack\node_modules`
  first, and `--repo C:/workspace/tolstack` with **forward slashes** — the Bash
  tool eats the backslashes and the tier then reports "no topologies.json under
  C:workspacetolstack" and passes 1/1 while having run nothing.
