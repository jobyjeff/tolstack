---
type: bug
priority: low
status: open
area: tests/browser-truth
class: browser_tier_flake
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261117_the_base_stack_joints_are_seat_boss_and_pattern.md
---

# `topology file://`'s reload restore of column width flakes in the whole browser tier

Measured in the round-2 review of `the_base_stack_joints_are_seat_boss_and_pattern`
(merge `65339f5d`, 2026-11-17): in the whole tier, `[topology file://]` was
134/135, with the sub-check "a reload gets the remembered column width and
Preview height back" red. Run `--only "topology file://"` on the same tree and
scratch root straight after, it was 135/135, and so was its respine sibling (44/44). It was green in the
whole tier one round earlier, and nothing in the branch touches column widths,
the Preview or storage. The check reads browser storage across a reload.
Whether the whole tier's earlier suites leave storage or timing behind is the
first thing to look at.
