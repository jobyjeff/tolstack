---
type: chore
priority: low
status: deferred
area: viewer/debug-probes
reporter: agent
found_by: docs/sessions/HANDOFF_20261029_a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark.md
class: dead_code_after_retirement
defer_until: 2026-11-29
resolution: triage 2026-10-30: low, deferred by default to a date (class has no program)
---

# Six debug probes and two CSS rules still drive the retired topology hover cards

The 2026-10-30 handoff `a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark`
removed the topology page's edge, node and component hover cards. The tiers were
re-anchored, but some hand-run code was not:

- **Hand-run probes that read `.hovercard*` on the topology page.**
  `tests/debug_hover_deslop.mjs` (its `componentCard()` waits for a component
  card that no longer opens), `tests/debug_crop_lightbox.mjs:234` (waits for
  `#croppop.hovercard--edge`, which nothing opens now), and possibly
  `debug_flyout_and_alerts.mjs`, `debug_nav_tooltip_and_rail_hover.mjs`,
  `debug_reader_facing_copy.mjs` and `debug_typography_pass.mjs`. Some of these
  read the stack page's citation or alert cards, which still exist. No tier
  runs them, so nothing goes red. A reviewer who runs one gets a timeout and
  can't tell it from a regression.
- **Dead CSS.** `apps/viewer/style.css:912-913` still sizes
  `.hovercard--component` and `.hovercard--node`. No renderer emits either
  class any more (`git grep hovercard--node -- apps/viewer/*.js apps/viewer/views/` is empty).

Fix: run each probe once against `--repo <a scratch root>`, and either
re-point it at the Preview (`section.detail__preview[data-preview-key]`) or
delete the cases whose surface is gone. Drop the two CSS rules.
`hovercard--citation` on the same line stays.
