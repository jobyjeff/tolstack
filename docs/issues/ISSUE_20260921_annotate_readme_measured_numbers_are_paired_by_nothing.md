---
type: chore
priority: med
status: open
area: apps/annotate
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260921_annotate_face_suggestions.md
---

# `apps/annotate/README.md` now states measured geometry numbers, and it is the
# one app README no doc-scan reads

## What is wrong

`CLAUDE.md`'s standing rule: *"A quantity written in prose that no test reads
from the tree is a defect, regardless of whether it happens to be right
today."* `apps/annotate/README.md` gained four such quantities on 2026-09-21
(handoff `annotate_face_suggestions`), in its "The one narrowing this app
cannot do, and why" section:

> the NAS6403U11D bolt's full-diameter shank reads **2.4065** and the
> 214820-002 bushing's bore **2.4130**, which is the **0.27%** that a fit looks
> like, and it narrows the bolt's **eight** round faces to the **four** that
> are the shank.

Of those, exactly one is pinned. `apps/annotate/run_tests.cjs`'s `[real]` tier
pins the bushing bore (2.4130) against the .1900 in the 217755 parts list, and
pins the washer's radii and plane offset the same way. It deliberately does
**not** pin the bolt's shank radius, the 0.27%, or the 8 → 4 count: its
mating-fit check asserts only that the narrowing is strict
(`0 < matching.length < boltCylinders.length`) and that the cotter hole is not
kept — which is the right call, because those counts belong to whatever is in
the mesh store, and the tier does not own that.

So the design decision is well guarded and the prose beside it is not. Re-
tessellate the bolt, install a replacement mesh, or move a threshold in
`AA.FACE_CLASSIFY`, and the README keeps stating 2.4065 / 0.27% / eight / four
with nothing red anywhere. `2.4065` is additionally a hand-copy: it appears in
the fast tier only as a *synthetic* constant
(`run_tests.cjs`, the `CYL(2.4065, …)` fixture), copied from the measurement
rather than read from it.

The structural half of this is worth stating on its own: **`apps/viewer/`'s
README has a doc-facts scan (`tests/test_viewer_readme_doc_facts.py`) and
`apps/annotate/`'s has none.** `apps/annotate/README.md` is now the longer of
the two and is the document a reader is pointed at from `ARCHITECTURE.md`,
`docs/ANNOTATION_SURFACE.md` and `CLAUDE.md`.

## Not a defect in the measurement

The numbers are correct today — re-derived against the `[real]` tier's own
output during review (`bore r=2.413; bolt round faces 8 -> 4 at that radius
(2.4065 ×4)`). This is about what breaks tomorrow, not about what is wrong now.

## What a fix could be, in rough order of cost

1. **Cheapest:** rewrite the sentence so the quantity is the *claim* and not the
   digit ("the shank and the bore agree to well under a percent, and the
   narrowing drops the cotter-hole faces"), leaving the digits to the tier that
   prints them. The [real] tier already reports them on every run.
2. **Better:** a `tests/test_annotate_readme_doc_facts.py` in the shape of
   `test_viewer_readme_doc_facts.py`, pairing the README's stated numbers
   against the source that owns each one.
3. The same question applies to
   `docs/sessions/lessons/LESSONS_20260921_annotate_face_suggestions.md`'s
   classification table (2 481 / 3 632 / 4 962). That one is a **dated record**
   rather than a live document, and it names the command that re-derives it —
   but its own sentence, *"these numbers are not a claim that decays"*, is
   stronger than the guard behind it: the `[real]` tier pins a 45% aggregate
   floor, not the per-class counts.
