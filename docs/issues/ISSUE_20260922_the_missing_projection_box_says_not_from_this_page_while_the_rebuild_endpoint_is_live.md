---
type: bug
priority: med
status: open
area: apps/viewer
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260921_policy_free_brief_residues.md
---

# The missing-projection box says "not from this page" unconditionally — including on the one origin that *can* rebuild from this page

`HANDOFF_20260921_policy_free_brief_residues` replaced the two banner
missing-projection commands (and the topology pane's) with
`VA.PROJECTION_BUILT_ELSEWHERE` (`apps/viewer/viewer.js`):

> It is built in the tolerance-stack repository, not from this page.

It is rendered by `missing()` and by `views/topology.js`'s empty state with **no
capability gate**, while the same banner already gates a real Rebuild button on
`state.capabilities.rebuild` (`rebuildAffordance`). On a served page whose
sibling mount has the rebuild endpoint live, that sentence is **false**: the
page can start the build.

## Why it is reachable, not hypothetical

- `apps/viewer/storage/http.js` probes `../rebuild/status` on the
  sibling-data-mount candidate and reports `capabilities().rebuild`.
- The endpoint has shipped: `drawing-checker/webui/main.py` serves
  `POST /tolstack/rebuild` + `GET /tolstack/rebuild/status`, and
  `webui/tolstack_rebuild.py` runs **`scripts/rebuild_projections.ps1`** — the
  whole three-projection recipe, so it does not care which projection is
  absent.
- Nothing pins the combination. The browser tier's
  `[rebuild affordance (stub sibling mount)]` suite exercises
  **stale + capability** and **stale + no capability** (`matchCrops: false`);
  there is no `missing + capability` case in any tier.

## The comment that justifies it is wrong, and that is the load-bearing half

`viewer.js`'s note beside the constant reads *"nothing can service a projection
that does not exist yet, so the honest interim is to say where the work happens
and stop."* This repo's own
`ISSUE_20260910_other_viewer_surfaces_still_print_terminal_commands.md` records
the opposite, in as many words:

> they all fire on "nothing built yet", not "stale" — a state
> `tolstack_mount_rebuild_endpoint`'s single rebuild action **also covers**,
> since it reruns the whole `rebuild_projections.ps1` recipe regardless of which
> projection is missing.

The sentence shape was also borrowed from `apps/annotate/`'s
`AA.NO_PROJECTION_NOTICE`, whose own comment gives the reason it is honest
*there*: *"this app has no transport that could ask anything to rebuild
anything"* (`ISSUE_20260910_annotate_has_no_http_read_transport`). The viewer
has one. The copy travelled; the justification did not.

## Why this is filed rather than fixed

Whether **every** missing-projection message gets a button is the design call
already routed to strategy in
`ISSUE_20260910_other_viewer_surfaces_still_print_terminal_commands`
(`status: triaged`, `strategy:
docs/strategy/BRIEF_20260911_served_surface_capability_gaps.md`) — this is item
4's remaining quarter, not a residue. **All four of that issue's bullets are now
done** — `views/crop.js` and `apps/annotate/app.js` on 2026-09-15, the banner's
two `missing()` boxes and `views/topology.js`'s empty state by this handoff — so
what is left of it is only the design call, and the capability gate above is
that call's concrete remainder. Triage may want to re-disposition it on that
basis rather than leave it reading as four live command sites.

What a fix looks like, smallest first:

1. Correct the comment either way — the claim about what can service a missing
   projection is checkable and currently wrong.
2. Gate the sentence: with `capabilities().rebuild` true, offer the existing
   `rebuildAffordance` button in the missing box instead of the "not from this
   page" line; with it false, keep the sentence.
3. Pin the combination the tiers do not reach: a `missing + rebuildCapable:
   true` case in `testRebuildAffordance`, which is one more `withServer` call
   with the projection withheld.
