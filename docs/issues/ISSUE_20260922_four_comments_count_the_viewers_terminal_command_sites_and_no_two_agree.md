---
type: chore
priority: low
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260921_policy_free_brief_residues.md
---

# Four comments count "the four terminal commands in the viewer's chrome" and no two of them mean the same four

`HANDOFF_20260921_policy_free_brief_residues` removed the last three live
command sites and recorded why in a comment beside each. Each comment states a
**count of sites**, and the memberships conflict:

| file | what it says | the four it implies |
|---|---|---|
| `views/banner.js` docstring | "the two 'projection not built' boxes … were the last of the four sites in the viewer's chrome" | stale-pair box ×2 + crop popover + banner = the banner's two are one site |
| `views/banner.js`, `missing()` | "the LAST of the four terminal commands … (the crop popover's went 2026-09-15, the disclosure's two before that)" | stale-pair ×2 + crop popover + `missing()` — **excludes the topology pane, removed in the same commit** |
| `views/topology.js` | "was the third of the four terminal commands in the viewer's chrome" | a four that **includes** the topology pane |
| `tests.js` | "these were the last two of the four terminal commands in the viewer's chrome" | the banner's two are #3 and #4 — which collides with `views/topology.js`'s #3 |
| `viewer.js` | "said ONCE for all four surfaces … the banner's two missing-projection boxes, the topology pane's empty state, and (through those) both pages" | enumerates three, totals four |

The session's own lesson gives a fifth reading — *"'the fourth site' was sites
four, five and six"* — which is the honest one for what was found (banner ×2,
topology pane, and `views/stack.js`, filed as
`ISSUE_20260922_the_stack_pages_no_loader_warning_is_the_fifth_terminal_command_in_the_viewer`).

## Why it is worth an issue rather than a shrug

This is the repo's own rule, from `CLAUDE.md`: *"A quantity written in prose
that no test reads from the tree is a defect, regardless of whether it happens
to be right today."* Nothing reads any of these counts, and the next reader
trying to answer "how many were there, and are they all gone?" gets 4, 5 or 6
depending on which file they open. The class is already on the review overlay
("One number, two nouns, both in the same commit").

## The fix, and it is small

Say the **class** instead of the tally in all five places — "the last of the
command sites in the viewer's chrome", with the site list itself living in one
place (the `views/banner.js` docstring is the established home) and the other
four pointing at it. A count nobody can pair against the tree should not be
written down five times; one enumeration that a reader can check against
`docs/issues/ISSUE_20260910_other_viewer_surfaces_still_print_terminal_commands.md`
is worth more than five disagreeing numerals.
