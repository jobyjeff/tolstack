---
type: bug
priority: low
status: open
area: viewer/topology-summary
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_findings_splitter_scopes_to_excluded_terms.md
---

# `AUTHORED_REASON_SPLIT` still cuts at an em dash, and nothing witnesses that alternative

`apps/viewer/topology.js` splits an authored finding on
`/ -- | — /` — two alternatives, of which only the first is the
convention the surrounding comment documents ("Every excluded term in the live
projection that carries a reason at all carries it this way"). The em-dash
alternative is a second, undocumented rule for the same field.

`REVIEW_20260922_viewer_summary_balance_sheet.md` finding 5 raised this and
deliberately did not file it, on the reasoning that
`findings_splitter_scopes_to_excluded_terms` "should settle it". **It did not,
and could not**: that handoff scoped *which buckets* reach the splitter and
was told to leave the split behaviour itself unchanged. The alternative is
still live for the one bucket that is still split.

## Measured (2026-09-22, live projection at `built_at 2026-09-23T03:25:40+00:00`)

- Strings anywhere in `data/projections/viewer/topologies.json` containing
  ` — `: **0**. Excluded terms containing it: **0 of 46**.
- No test in `apps/viewer/tests.js` exercises the alternative, so deleting it
  reddens nothing.

## Why it is worth a line of work rather than nothing

An excluded term is authored prose, and an em dash surrounded by spaces is
ordinary punctuation in this repo's prose (this sentence has one). The first
author who writes one gets their term cut at a point they did not choose —
and if the term carries both, `String.match` takes whichever comes **first**,
so the em dash wins over the ` -- ` the author actually meant.

## Fix

Either delete the alternative (nothing in the live corpus needs it), or keep
it and pin it with a fixture term whose separator is an em dash, so the second
rule is documented in the comment and witnessed by a test rather than
inherited silently.
