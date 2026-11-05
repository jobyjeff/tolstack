---
type: chore
priority: low
status: open
area: viewer/witnesses
reporter: agent
class: unmeasured_cost
found_by: docs/sessions/reviews/REVIEW_20261103_every_study_opens_in_3d_showing_only_its_parts.md
---

# Two fast mutation witnesses from every_study_opens_in_3d were not shown at review

`fast__every-kind-of-study-row-wears-a-3d-control-where-the-sce__13ab073e` and
`fast__the-study-s-parts-are-one-command-lit-edges-parts-a-join__baf0451a`
report "the tier was red before the mutation" from a worktree, because the fast
tier's `[real]` projection-freshness check is red against the main checkout's
trunk-built projection (the one remaining red, 515/516). Nothing was proved
either way. Re-run both with `--only` after the batch merge's
`scripts/rebuild_projections.ps1`, in the main checkout.
