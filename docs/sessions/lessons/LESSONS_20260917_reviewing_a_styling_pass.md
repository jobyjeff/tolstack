# LESSONS — reviewing a styling-only pass (2026-09-17)

From `review/design_pass_typography`. This is not a checklist entry (those went
into `docs/prompts/REVIEW_AGENT.md`) — it is the *technique* that made that
review possible, written down because four more `design_pass_*` handoffs are
staged across the workspace and their reviewers will hit the same wall: **a
styling pass has no assertions to read, so a reviewer who only runs the tiers
has verified nothing about the deliverable.**

## The wall

`pytest` never opens a `.css`. The fast tier's DOM shim has no geometry and no
computed styles. The browser tier measures the boxes and backgrounds somebody
previously chose to measure. So on a CSS-only diff, all three tiers are green
before you start and green after you revert the whole thing — measured here:
seven separate reverts, then all seven together, `453/453` and `22/22` every
time. Green is not evidence and cannot be made into evidence by running it again.

## What is actually checkable, in increasing order of value

**1. Mutate each deliverable and report the tier counts.** Standard here, and
still the first move: `git archive HEAD | tar -x -C <scratch>`, junction
`node_modules` in, revert one edit, run the tiers. Do them **one at a time** as
well as together — the group result does not imply the individuals. Put the
scratch root somewhere short; the agent scratchpad path blows `MAX_PATH`.

**2. Re-derive the premise the pass argued from.** A styling handoff's reasoning
is a set of factual claims about the *baseline* tree, and you still have that
tree. Here: "nine distinct sizes for six kinds of text" (`git show
integration:<file>` + grep: exactly 10…18px, nine values); "the annotator's rail
was the largest type on the page" (measured 16px against an 18px title once the
title moved, and 16px against a 16px title before); "`h3` renders 26 document
headings" (`grep -c '^### '` on the live worksheet: 26). Every one of those is
one command, and a wrong one would have invalidated a rule the next agent is
told to copy.

**3. Re-take the screenshots and sha them.** This is the one worth the whole
lesson. A committed before/after pair is normally unfalsifiable — you look at it
and agree. It is not unfalsifiable if the probe that produced it is
deterministic, and `tests/debug_typography_pass.mjs`'s `--phase before|after`
shape makes it so: same viewport, same nav id, same row, same scroll, so the two
images differ only where the stylesheet does.

So the reviewer's move is:

* re-take the `after` phase from the merged tree;
* put the **baseline** stylesheets into the scratch tree
  (`git show integration:apps/viewer/style.css` etc., leaving everything else at
  HEAD) and re-take the `before` phase;
* `sha256sum` both sets against the committed PNGs.

Result here: **26 of 26 byte-identical**, on a different machine, days later.
That single number says the evidence is honest, the stylesheets are the only
variable, and nothing was hand-touched — and it is the only thing in the review
that speaks to the *deliverable* rather than to its guards. It also means a
one-byte difference in a future re-take is a real difference and not noise,
which is what makes the pair worth keeping in git at all.

**Corollary: a deterministic `--phase` probe is a *reviewable artifact*, and a
non-deterministic one is a picture.** When you review a styling handoff, check
that its probe takes both phases the same way before you look at what it
produced. If the shots were taken by hand, or by a probe that reads the live
clock, the window size or anything the stylesheet does not control, step 3 is
unavailable and the review is back to agreeing with a picture.

## Two traps in step 3

* **Restore every path you checked out, in one command.** Reverting the
  stylesheets to shoot `before` is the same footgun the handoff's own lesson
  records — `git checkout <sha> -- a b` then `git checkout HEAD -- a` leaves `b`
  reverted and staged. Do it in a scratch tree instead of your worktree and the
  problem cannot arise; that is why the scratch tree is worth setting up even
  when you are not mutating anything.
* **The probe may not survive its own run.** This one aborts before 6 of its 13
  surfaces in five runs of eight
  (`ISSUE_20260917_the_typography_probe_crashes_on_the_stack_table_shots_in_five_runs_of_eight`).
  It completed twice, which was enough — but budget for re-runs, and do not read
  a partial run's census as the whole table.

## And the question the tiers will not ask for you

Once a styling handoff hands you a guard, the tempting conclusion is that the
pass is pinned. Ask instead **which of the deliverables the guard's assertions
are about.** `tests/test_app_type_scale.py` is a good guard, observed failing
four ways — and it reads `:root` and the `font-size` declarations, so it is blind
to every selector below it, which is where the pass's actual rules live. The
distinction is not a gotcha; it is the difference between pinning the *numbers*
and pinning the *rule*, and for CSS the rule is usually about inheritance and
therefore reachable only through `getComputedStyle` on a descendant.
