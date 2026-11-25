# BRIEF 2026-11-25 — the bind bar and the feature body are gone: which of the gestures they held get a home, and which retire?

> **Routing note.** Filed by the 2026-11-25 triage sweep as the class-scoped
> proposal for `setting_without_surface`: three issues arrived in two days
> (11-23, 11-24, 11-24), each asking the same question about a different
> control. One decision answers all three; three tactical handoffs would each
> re-decide it.

## The question

Two handoffs retired the annotate page's old editing surfaces:
`editing_a_feature_opens_its_form_where_the_tree_was` (2026-11-23, the feature
body and the bind bar's form) and
`right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays`
(2026-11-24, the bar over the 3D canvas now holds play controls only). Several
gestures had no home in what replaced them. The schema, the writers and the
fold all still carry them; nothing on screen reaches them.

**Decide the policy: does a gesture that no surface reaches get a home in the
form, in the right-click menu, or retire as a UI gesture (schema kept, agent
scripts may still write it)?** And then, per gesture, which.

| gesture | issue | issue's recommendation | used in Jeff's log |
|---|---|---|---|
| **Flip** (move a binding to the free other end of a dimension) | `docs/issues/ISSUE_20261123_flip_has_no_place_in_the_features_form.md` | the face's right-click menu | console verb still works |
| **Five optional `bound` fields** — composition note, owner part, GD&T modifier, general-tolerance regime, note | `docs/issues/ISSUE_20261124_no_surface_writes_a_bindings_note_modifier_or_owner_part_since_the_bind_bar_retired.md` | nothing until a stack needs one; document it in `docs/ANNOTATION_SURFACE.md` | 0 of 116 events (2026-11-24) |
| **Owner-not-in-set** and the **"drawing wins"** precedence note | `docs/issues/ISSUE_20261124_owner_not_in_set_and_the_drawing_wins_note_have_no_surface_since_the_bar_went.md` | precedence fact on the Preview; retire owner-not-in-set | 0 `owner_not_in_set` events |

## Why it needs a strategy call rather than a tactical agent

Each issue offers options and a recommendation, and each recommendation is
reasonable on its own. But they pull in different directions (one menu home,
one "nothing, document it", one "retire") and together they set the rule for
the next retired surface. That rule — *what a person can no longer do from the
page, and where that is written down* — is a policy, not a layout detail.

## What a decision produces

One small tactical handoff in tolstack implementing the chosen homes and
retirements, plus a line in `docs/ANNOTATION_SURFACE.md` naming every
retired gesture and how (if at all) it is still written.
