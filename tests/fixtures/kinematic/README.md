# Kinematic-study fixture

A hand-built tree for `tests/test_kinematic.py`: one topology, one kinematic
study, and one synthetic `linkage-sweep/v1` artifact (three sweep points, two
measures, four parameters, hand-chosen Jacobian entries). Every expected
number in the test is computed by hand from the entries written here, so
editing an entry means re-deriving the test's expectations, not regenerating
them.

`data_root/` stands in for a data root: the study resolves its run under
`data_root/inbox/linkage-sweeps/`, exactly as the real one resolves under the
main checkout's `data/`.
