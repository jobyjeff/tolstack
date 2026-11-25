---
priority: med
depends_on: [the_pane_opening_browser_suites_are_green_every_run]   # both edit apps/annotate/app.js, apps/viewer/topology_app.js and the browser runner; the sibling the_real_browser_checks_hold_their_premise_by_construction touches only the runner's test harness and may run beside this one
model: sonnet
hitl: false
---

# HANDOFF 2026-11-25 — a_write_from_the_form_or_the_menu_never_vanishes_without_a_word: every gesture on the binding surface either lands or says it did not

Source: triage sweep 2026-11-25. The feature's form and the row menus
(`editing_a_feature_opens_its_form_where_the_tree_was`, 2026-11-23;
`right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays`,
2026-11-24) left five ways a reader's gesture is lost with nothing on screen
saying so:

- `docs/issues/ISSUE_20261124_a_tick_answering_two_proposals_leaves_a_binding_without_its_note_and_modifier.md` (med)
- `docs/issues/ISSUE_20261124_unbind_from_a_rows_menu_fails_without_a_word.md` (med)
- `docs/issues/ISSUE_20261124_play_with_a_form_open_discards_its_unsaved_set_without_a_word.md` (med)
- `docs/issues/ISSUE_20261123_a_tree_rebuild_between_a_press_and_its_release_drops_the_click.md` (med)
- `docs/issues/ISSUE_20261124_next_in_a_features_form_cycles_between_features_that_offer_nothing.md` (low)

Baseline: trunk plus `the_pane_opening_browser_suites_are_green_every_run`.
Scope: `apps/annotate/binding_state.js`, `apps/annotate/app.js` (transport and
edit), `apps/viewer/topology_app.js` (`runMenuItem`, `formPress`,
`renderNav`, `easeHeight`), `apps/viewer/views/nav.js` (the form's Next),
`docs/ANNOTATION_SURFACE.md` ("Editing a feature"), the annotate and viewer
fast tests, and new checks in the form and menus browser suites. Do NOT touch:
`installRealAnnotatorReads`, `testContextMenus`'s gating, or
`apps/annotate/run_browser_check.mjs` (handoff
`the_real_browser_checks_hold_their_premise_by_construction`); the pane's
hidden rail writers and owner-not-in-set (separate, deferred issues).

## Deliverables

1. **A tick that answers several proposals keeps what the binding recorded.**
   `AA.planEditCommit` (`binding_state.js`, ~line 1139) writes the set once
   through `AA.buildFeatureSetEvent`, which carries note, GD&T modifier, owner
   part, regime and composition note from the superseded binding. Each further
   proposal it answers is another `bound` from `AA.buildBoundEvent` that
   supersedes the one before and carries none of them, so the standing binding
   loses them. Measured in review 2026-11-24 with a scratch log: `tick` carried
   `note` and `M`; `tick-ratifies-2` and `tick-ratifies-3` did not, and the
   Python fold (`build_projection(events, load_models())`) left
   `tick-ratifies-3` standing with `note=None`, `gdt_modifier=None`. Build each
   further answer from the event before it (`AA.buildCorrectionEvent(prev, …)`,
   ~line 715) or copy the carried fields. Latent today (none of Jeff's events
   carries those fields), so no data migration.
2. **The row menu's Unbind reports a failure where the reader is.**
   `runMenuItem`'s `A.unbind` branch (`topology_app.js` ~line 2523) sends
   `postToPane(["unbind", edgeId, end, topologyId])` with no id, so a refused
   or failed write (busy behind another write, server error, log refusal) is
   heard by nothing. Send it as `formPress` (~line 2331) does, with an id, and
   surface `onFormWriteResult`'s "not written" state on the row or as the
   page's toast. One option the issue names: open the form and press its
   Unbind, the way "Bind the suggested faces" runs the form's tick.
3. **A transport press does not throw away an open form's set.** In sweep mode
   with a form open and a face in the set, ▶ / Space / a step / the scrubber
   moves the pose, `transportEndsArm` (`app.js` ~line 3697) calls
   `disarmPick("moved")`, the pane's tree drops its `edit`, and the shell
   closes the form — faces gone, nothing written, nothing said. Suggested
   (the issue's option a, smallest, and it matches "a binding is identity,
   recorded against geometry in the as-modelled pose"): while a form is open
   the transport controls are disabled, with a hover saying why. Choose and
   say why in the lesson if you take another option.
4. **A press whose release lands after a tree rebuild still clicks.**
   `renderNav` rebuilds the structure tree whole on every paint, write and pane
   message; a press on a twisty or row whose release lands on the rebuilt
   element gets no `click`. Measured: in the first ~10 s after the pane opens it
   redraws the column several times a second, and 1 run in 4 lost the second
   of two twisty presses 450 ms apart. `easeHeight` drives a detached element
   the same way (open-snap-closed). Fix: skip a rebuild while a pointer button
   is down over the column and run it on release — or patch rows in place
   from `VA.navPlan`. Then the "tree holds still" suite's two-quiet-seconds
   wait can go (keep it if removing it reddens anything, and say so).
5. **Next has an end.** On "NAS77A3-015A flanged bushing, tangential link",
   after the last feature with a suggestion, Next alternates between the two
   unbound features that offer nothing and never returns to the tree. Next
   goes to the next unbound feature after this one in tree order and is not
   shown past the last one. Update `docs/ANNOTATION_SURFACE.md`, "Editing a
   feature", to the rule as built.

Sites: deliverables 2–3 are seen in the shell (served page, hosted page if the
form runs there — say which); deliverable 1 is a write path only.

## Definition of done

- Fast tests: an annotate check round-trips a noted, `M`-modified binding
  through a two-proposal tick and folds it in Python with the fields standing;
  a viewer check that Next stops after the last unbound feature.
- Browser checks (form and menus suites): the pane refuses an Unbind from the
  menu and the reason is on screen; ▶ with a changed set in an open form keeps
  the set; two twisty presses 450 ms apart in the pane's first seconds both
  land. Each new guard gets a witness spec that reddens it.
- Both tiers green once on the branch.
- Covered issues set `status: resolved` with the fixing commit.
- Lesson (`docs/sessions/lessons/LESSONS_20261125_a_write_from_the_form_or_the_menu_never_vanishes_without_a_word.md`):
  the transport option chosen and why; whether rows are patched in place or the
  rebuild deferred, and the measured lost-press rate after.
