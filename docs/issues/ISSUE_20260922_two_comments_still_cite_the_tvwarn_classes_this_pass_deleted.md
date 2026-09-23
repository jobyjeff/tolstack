---
type: chore
priority: low
status: open
area: viewer/docs
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_viewer_summary_balance_sheet.md
---

# Two comments still cite the `.tvwarn` classes this pass deleted

`viewer_summary_balance_sheet` (2026-09-22) removed `.tvwarn`,
`.tvwarn--lower-bound` and `.tvwarn--unverified` from
`apps/viewer/topology.css` along with `VA.zeroWidthWarning`. Two live files
still describe them as present:

* **`apps/annotate/style.css:298`** — the `.precedence-note` rationale ends
  *"Same shape the viewer gives its own chain-level warnings
  (`.tvwarn--unverified`), so a reader who has learned one has learned this."*
  The viewer no longer has that shape at all; the claim the annotate app's
  styling rests on now points at nothing. Needs a decision, not a rename:
  either re-point it at whatever the viewer's equivalent is today (the
  findings table's per-kind hairline, `.tvfind__row--unverified_value`, is
  the nearest) or drop the cross-reference and justify the spine on its own.
* **`tests/debug_typography_pass.mjs:357`** — the `5_totals_verdicts_and_gaps`
  surface comment describes the pane as stacking *"a strip, cards, warnings
  and a 38-row gap list"*. The selector it uses (`#totals .tvgaps__summary`)
  still resolves, so the tool runs; only its description of what it is
  photographing is stale.

Neither is a behaviour defect. Both are the residue class the review overlay
names ("a doc citing a symbol by name — resolve the name to the thing that
exists"), and a comment that credits a deleted class is how the *next* pass
learns a rule that is no longer there.
