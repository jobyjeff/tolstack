---
type: bug
priority: med
status: triaged
area: viewer/topology-summary
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_viewer_summary_balance_sheet.md
handoff: docs/sessions/HANDOFF_20260922_findings_splitter_scopes_to_excluded_terms.md
---

# The authored-finding splitter also cuts EDGE NAMES, where the same ` -- ` means something else

`VA.splitAuthoredFinding` (`apps/viewer/topology.js`, 2026-09-22) splits a
finding at ` -- ` into a **name** (the row) and a **rationale** (the fold).
`LESSONS_20260922_viewer_summary_balance_sheet.md` justifies it as an
**excluded-term** convention: *"Every excluded term in the live projection
that carries a reason at all separates what from why with ` -- `."* That is
true of excluded terms.

But `VA.studyFindings` runs the same splitter over all three buckets, and two
of them — `attention.unverified` and `attention.noTolerance` — are **edge
names**, where ` -- ` is a *naming* convention (`name -- clarifier`), not a
what/why one.

## Measured against the live projection (2026-09-22)

58 strings in `data/projections/viewer/topologies.json` carry ` -- `, and they
are not only excluded terms: `edge.name` and `node.name` use it too
(`shank out -- full-diameter shank beyond the modelled clamped stack`,
`flat washer far face -- the last modelled clamped surface`).

One of them is live in a findings table today. The edge
`piston end to end-stop feature -- the end stop` is `untraced` and in the
chain of **five** studies (`pitch_system_blade_angle_average`,
`…_worst`, `…_end_stop_minus7`, `…_end_stop_plus72`,
`pitch_system_vertical_hub_to_pitch_arm`). Each renders it as a row reading
`piston end to end-stop feature`, with `the end stop` presented in the fold
as though it were the author's argument for why the value is unverified —
beside `closes: Find the drawing callout or datasheet line…`. The screenshot
in the lesson (`…_4_nineteen_findings_after.png`) shows exactly this row.

No fact is lost (the whole string is the `<summary>`'s `title` and the fold
holds the remainder), but the row names the edge by a name the grid one block
above does not use, and the fold labels a descriptive clarifier as a
rationale.

## Second-order: it makes a live `[real]` test fragile

`[real] a study fed by a zero-width row warns that its spread is a lower
bound` asserts `shownRows.indexOf(edge.name) !== -1` over
`summary.tvfind__name` text. That holds today only because no *zero-width*
edge's name happens to carry a ` -- `. The first one that does reddens the
test on a projection rebuild, with nothing in the diff to explain it.

## Fix

Split only what the convention is actually about: pass the splitter the
`excluded_from_model` bucket and take `unverified` / `no_tolerance_recorded`
names whole (the CSS already clamps an unsplit name to one line). Pin it with
a fixture whose edge name carries a ` -- `.
