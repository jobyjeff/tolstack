---
type: bug
priority: med
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260921_policy_free_brief_residues.md
---

# The stack page's no-loader warning is a fifth terminal command in the viewer, on a branch no tier reaches

`apps/viewer/views/stack.js`, in the `!(stackProj.checks || []).length` arm of
the checks section, renders:

> This stack declares archetype "…", whose checks are GENERATED from its own
> block rather than authored in the file — and the projection has NO LOADER for
> that archetype, so there are none here to render. This is NOT a stack without
> checks. **Add the archetype's loader to ARCHETYPE_LOADERS in
> `scripts\build_viewer_projection.py` and rebuild.**

Three separate violations of the standing web-UI rules in one sentence: a
terminal path (`scripts\build_viewer_projection.py`), an internal module-level
constant name (`ARCHETYPE_LOADERS`), and advice a reader of a web page cannot
act on. The same class as the four sites
`HANDOFF_20260921_policy_free_brief_residues` removed from the banner, the
topology pane and (on 2026-09-15) the crop popover — this is the fifth, and it
was not in that handoff's stated scope (`views/banner.js`,
`run_viewer_browser_tests.mjs`, `topology_pitch_system.json`), so it is filed
rather than fixed.

## Why no guard caught it

The shared ban list now carries a SHAPE for a script filename
(`apps/viewer/reader_facing_bans.js`, `/\b[\w.-]+\.(?:py|exe|ps1|bat|cmd|sh)\b/`),
so this string *would* fail the stack-surface walk — if any fixture or live
projection reached the branch. None does: the arm needs
`checks_generated_not_rendered: true` **and** an empty `checks` list, which is
only true of an archetype the projection has no loader for, and every archetype
in the tree has one.

This is exactly the shape
`ISSUE_20260916`-era work named as "a guard whose covered branch is
unreachable is a guard reporting green over nothing", and the fix that repo
already knows: render the branch from its own domain rather than waiting for a
fixture to reach it (see `tests.js`, "every branch of the CTE sourcing
vocabulary is scanned for schema jargon, including the ones no live or fixture
entry reaches").

## What a fix looks like

1. Rewrite the sentence in reader's terms. The fact worth keeping is the one the
   comment above it names — *"'no checks' and 'this stack's checks are generated
   and this surface cannot render them' are different facts"* — and the
   remainder (which constant, which script) is for whoever maintains the
   builder, not for a reader of the page. `VA.PROJECTION_BUILT_ELSEWHERE` in
   `viewer.js` is the established sentence for "the work happens in the repo".
2. Enroll the branch: render `VA.renderStack` over a projection carrying
   `checks_generated_not_rendered: true` and no checks, and put it through
   `surfaceIsClean`. Without step 2 the rewrite is unguarded and comes back the
   way four of the command sites already did.
