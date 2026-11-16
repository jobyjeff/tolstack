---
type: chore
priority: low
status: deferred
defer_until: 2026-12-16
class: design_token_literal
resolution: deferred 2026-11-16 triage -- low defers by default; 30-day date
area: design
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20261116_the_map_draws_the_end_stop_model.md
---

# Design: the pressed / ghost control background is a colour literal at seven sites in three stylesheets

`docs/DESIGN_TYPE_AND_COLOUR.md` puts every colour and size number in
`apps/viewer/style.css`'s `:root` tokens and pairs the two apps against it.
The ghost button's background is the one colour that never became a token:
`#363b45` is written as a literal in `style.css` (four sites: `button.ghost`,
`.croppop__close`, two more), `topology.css` (two: a settings-bar pressed
state and `.tv__toolbar .tvview button.ghost[aria-pressed="true"]`) and now
`map.css` (`.tv__daghead button.ghost[aria-pressed="true"]`, added by handoff
`the_map_draws_the_end_stop_model`, 2026-11-16, copying the toolbar's rule).

Each new pressed control copies the literal from the last one, so a change
to the control colour is a seven-site edit nothing checks. The map's copy is
the house pattern and is not a finding against that handoff; the class is.

**Fix:** one token (`--control-raised`, say) in `style.css`'s `:root`, the
seven sites reading it, and `tests/test_app_type_scale.py` (which already
pairs the two apps' `:root` scales) extended to refuse a colour literal in a
rule that a token covers.
