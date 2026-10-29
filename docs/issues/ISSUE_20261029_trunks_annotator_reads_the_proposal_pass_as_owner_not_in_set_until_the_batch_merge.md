---
type: bug
priority: med
status: deferred
area: apps/annotate (binding state), feature-identity inbox
reporter: agent
found_by: docs/sessions/HANDOFF_20261028_an_agent_proposes_a_face_binding_and_a_human_ratifies_it.md
class: stale_artifact
defer_until: 2026-11-12
resolution: triage 2026-10-29: med beyond the budget (3 staged), deferred 14 days
---

# Until the batch merge, trunk's annotator labels the 33 proposed rows "owner not in set"

The first proposal pass (handoff
`an_agent_proposes_a_face_binding_and_a_human_ratifies_it`) wrote 55
`verdict: "proposed"` events into the main checkout's
`data/inbox/feature-identity/`, as its definition of done asked, and rebuilt
`data/projections/feature-identity/bindings.json` there from its own branch.
The main checkout's working tree is **trunk**, and trunk's code predates the
new verdict. Until the operator's batch merge carries the work to trunk:

- **The annotator Jeff opens from the main checkout gives the wrong alert on
  33 rows.** Trunk's `AA.elementBindingState` (`apps/annotate/binding_state.js`)
  reads any record with an empty `bindings` list as `owner_not_in_set`. Each of
  the 33 stack keys that now carries a proposal has such a record, so its rail
  row shows the "Recorded as belonging to a part that is not in this set" alert
  instead of "No face is bound to this element yet". The second text is the
  true one. Trunk has no Accept or Reject, so nothing can be answered from
  there either.
- **A hand run of trunk's `scripts/build_feature_identity_projection.py` or
  `scripts/fit_bound_features.py` fails** with `verdict must be one of
  ('bound', 'owner_not_in_set')`. The tactical lesson records this.
  `scripts/rebuild_projections.ps1` builds neither, so a scripted rebuild is
  unaffected.

**Resolution:** the batch merge fixes both, and nothing needs undoing. When
`integration` reaches `master`, confirm the 33 rows show the
"proposed by agent · high/medium" chip and no alert, then close this issue.

**The class, for later handoffs:** writing events in a schema that only the
branch can read into a gitignored production inbox, before the merge, puts
the branch's data in front of trunk's readers. Here the handoff required that
order, because Jeff's ratifying pass needs the events in the inbox. A future
schema extension should either be merged before its data is written, or
include a reader that tolerates the new verdict on trunk first.
