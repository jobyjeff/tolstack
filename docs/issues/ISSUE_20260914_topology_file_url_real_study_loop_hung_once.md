---
type: bug
priority: low
status: resolved
area: tests/browser-tier
reporter: agent
handoff: docs/sessions/HANDOFF_20260915_viewer_hygiene_pass.md
resolution: handoff completed 2026-09-15 -- closed automatically by dispatch when handoff `viewer_hygiene_pass` moved to completed/; not independently verified.
---

# `topology file://`'s real-data study loop hung once on a nav click that never went "stable"

One observation, not reproduced. Filed so a second sighting has something to
land on rather than being re-diagnosed from scratch.

## What happened

`node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack`,
2026-09-14, worktree `viewer_dag_hover_cards`, Chrome 152.0.7977.83:

```
[topology file://] ERROR: locator.click: Timeout 30000ms exceeded.
  - waiting for locator('[data-nav-kind="study"][data-nav-id="rotor_fastener_grip_u8h"]')
    - locator resolved to <div data-nav-kind="study" … >Grip budget, NAS6403U8H</div>
  - attempting click action
    - waiting for element to be visible, enabled and stable
[topology http] 128/128 sub-checks passed: PASS
```

The row **resolved** and was visible; playwright never called it *stable*, i.e.
its box kept changing across frames. `topology http` ran the identical loop
clean in the same process, and the immediately following re-run of the whole
suite was 16/16 with `topology file://` at 128/128.

Location: `testTheTopologyPage`'s real-projection block, the
`for (const study of topology.studies)` loop (`scripts/run_viewer_browser_tests.mjs`).

## What it is probably not

The run that hit it was the first one after `viewer_dag_hover_cards` added the
DAG-side hover cards, so that was the suspect. Against it: the failure is in a
later block that opens no cards and hovers nothing, the pointer is parked on the
topbar by then, and the very next identical run passed both modes. The card
work also cannot move a nav row — the popover is `position: fixed`.

More likely candidates for whoever picks this up: the file:// FSA adapter's
image reads landing late and firing `render()` while playwright is measuring
stability, or plain machine load (other suites were running concurrently on
this box at the time).
