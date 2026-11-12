---
type: bug
priority: low
status: open
area: scripts/propose_bindings
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261112_a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown.md
---

# An agent's proposals reach a page with no folder grant only after the next rebuild

Since 2026-11-12 both pages read the feature-identity **log**, not the built
projection. A page with no folder grant (drawing-checker's mount on 8000,
before the first bind) reads the served copy,
`data/projections/viewer/feature-identity/log.json`. Two writers refresh it:
`scripts/build_feature_identity_projection.py` (step 5 of the rebuild rail,
`feature_identity.write_served_log`), and the annotator after every event it
writes through its grant.

`scripts/propose_bindings.py` is the third writer of the log, and it does not
refresh the served copy. So a proposal an agent writes shows in the pane once
the folder is granted (the pane then reads the inbox itself), and in the tree
on a fresh load only after the next rebuild. That is the same staleness the
handoff removed for human binds, still in place for agent proposals.

**Fix shape:** after a successful write, `propose_bindings.py` calls
`tolerance_stack.feature_identity.write_served_log(events_dir, data_root)`.
It is a copy of inputs (no provenance gate), and a test can pin it the way
`tests/test_identity_fold_is_paired.py::test_the_builder_writes_the_served_log_beside_the_projection`
pins the builder.

Left out of the handoff because its scope was the two apps, the verdict
vocabulary and docs. `scripts/` was touched only where the served log is
written.
