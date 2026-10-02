---
type: chore
priority: med
status: deferred
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20261001_kinematic_sweep_animation.md
class: unowned_followup
defer_until: 2026-10-15
resolution: deferred 2026-10-01 (triage, second sweep) -- med beyond this sweep's BUDGET=3 for this repo. Not a judgement that it is unimportant; it is what the budget rule does with med past the cap.
---

# Four things sweep mode leaves behind, each with the site it reaches

Filed at hand-back of handoff `kinematic_sweep_animation` because each of these
is work that will have no owner the moment that handoff reaches `completed/`.
One file, four rows, the shape
`ISSUE_20260918_thirteen_new_guards_have_no_mutation_witness…` established.

| # | what | where it bites |
|---|---|---|
| 1 | The three new `[real]` guards over `data/inbox/linkage-sweeps/` carry **no mutation spec** | `scripts/mutation_witnesses/` |
| 2 | The `gas_spring` is never placed | sweep mode's bodies disclosure |
| 3 | Sweep mode is not reachable from the viewer — there is no launcher | `apps/viewer/` topology page |
| 4 | `apps/annotate/run_browser_check.mjs` is run by no gate | the merge checklist |

## 1 — the three `[real]` guards have no witness

`apps/annotate/run_tests.cjs` gained three `[real]`-tier guards reading the
published sweep runs. They were **not** enrolled, and the census pin was raised
instead — which the enrollment README explicitly allows and asks to be visible
in a diff, so this is that visibility.

The reason: a `[real]` guard SKIPS where its data is absent, and
`data/inbox/linkage-sweeps/` is gitignored and exists only in the main
checkout. A spec for one would report `NOT WITNESSED` on any checkout without
the inbox, which is the decay the witness tier exists to catch — so it would
produce exactly the false alarm it is supposed to prevent. Every one of this
repo's pre-existing `[real]` annotate guards is unenrolled for the same reason
(15 of 157 enrolled before this change, 32 of 177 after).

> **Corrected 2026-10-01 by review `kinematic_sweep_animation`.** The
> parenthetical above read *"27 of 177 enrolled before this change"*, which is
> wrong on both terms: the census pins the declared count at **157** before
> this change, and `scripts/mutation_witnesses/annotate__*.json` held **15**
> specs, not 27 — 32 now, which is the +17 this handoff enrolled. Re-derived
> from `git ls-tree integration` and from the census the tier prints.

**This is a question about the witness tier, not about these three guards**: is
there a way to witness a data-dependent guard that skips honestly? If the
answer is no, that is worth writing down once in
`scripts/mutation_witnesses/README.md` so the next five sessions do not each
re-derive it.

## 2 — the gas spring is never placed

`asm217755_PMF200521` has three recorded occurrences and the artifact gives the
`pitch_plate` body no joint anywhere near any of them, so the occurrence choice
refuses at 42.574 mm and the gas spring is not drawn. The honest state is on
screen with its reason, which is correct behaviour and not a bug.

What would fix it is a rule the implementation deliberately did not add:
**once one part of a body has been matched, the others could be resolved by
instance-path agreement** — the matched pitch arm sits under
`prd-e-03372837.1`, and a part of the same body sharing that prefix is the
same assembly position. That was prototyped and then left out because nothing
in either published run needed it (every other part matched on geometry
directly), and shipping an untested fallback is worse than not having one. If
a mechanism arrives whose parts mostly sit away from their joints, this is the
answer and it is cheap.

## 3 — no launcher from the viewer

Sweep mode is reachable by typing a verb or by hand-writing
`?sweep=<run-id>`, and a run id is a timestamped string a reader cannot know
without looking in a directory they have no shell for. That is the standing
web-UI rule broken in the one way the handoff's own fence allowed (it scoped
`apps/viewer/**` out except for `VA.annotateLink`): **no text inputs for
backend ids a user cannot know**.

`sweep latest` is the mitigation and it is a real one — it needs no id. But a
reader who wants a *particular* run has no path, and a reader who does not
already know the mode exists has no way to find it. The fix is a launcher
beside the viewer's existing 3D affordances, listing the published runs by
mechanism and date rather than by run id.

## 4 — `run_browser_check.mjs` is run by no gate

It is green (31 checks on the mock run, 38 with `--real`) and it found three
things the pure tier could not see — a camera the part loader stole, a viewing
axis that looked straight down a planar mechanism's own plane, and a joint
tooltip that was built, tested and wired to nothing. Nothing runs it. It is not in `CLAUDE.md`'s three-command merge list, and the annotate
fast tier has the same problem already filed
(`ISSUE_20260918_the_annotate_js_suite_is_run_by_no_gate.md`) — so this is that
issue's second instance rather than a new class, and it should probably be
fixed with it.

## Done when

Each row is either done or closed with its reason written where a reader of
that surface will meet it. Row 1 wants a sentence in the enrollment README
whichever way it goes.
