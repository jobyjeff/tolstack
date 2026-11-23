---
priority: high
depends_on: [the_tree_sits_beside_the_3d_canvas_and_holds_still]
model: opus
hitl: false
---

# HANDOFF 2026-11-22 — editing_a_feature_opens_its_form_where_the_tree_was: binding becomes one form with a visible set of faces, written once by a tick

Source: Jeff, 2026-11-22 (note `20261122T211136_iubdsx`, two chat messages, a
screenshot of the tree), and the sketch he said yes to. Second of a chain of
four.

Jeff's words:

> I was able to select a face on either of the shoulders, and it selected all
> the rest of the segments of that shoulder, however if I click "add a face"
> to add the second shoulder, the new selection replaces the old one. I need
> to select both.

> I selected one of the fastener holes, and it appeared to hilight the rest
> of the patterned holes, but the structure view gave zero feedback that
> nything was selected. Actually now I see it- the tiny little popup at the
> top of the canvas to confirm. needs to be more prominent

> If the face is already bound/confirmed, then it's irrelevant whether it was
> agent suggested, or at least that information should be hidden behind some
> kind of progressive disclosure

> Having a hard time articulating exactly what is wrong with the whole
> binding/selection system, as mentioned it just feels very unintuitive and
> clunky, unpredictable, disorienting etc.

> Another option would be similar to how Solidworks does it, where the left
> side menu is tabbed and gets replaced by the context menu/form for the
> object you're editing, then when you exit (checkbox or X) it drops you back
> to the structure view. […] I remember it's UI being the gold standard for
> simple and intuitive CAD controls.

> There is no way to preview the selected face (this already exists in the
> real app)

**The sketch**: `C:\workspace\dispatch\docs\strategy\drafts\mockups\tolstack_binding_pane_20261122\index.html`
and the `README.md` beside it. Click through it before reading further: open
a feature (double-click or its pencil), hover and click faces and list
lines, tick, X. The README's table of rules binds this handoff. It is a
layout and a behaviour, not a visual design.

Baseline: trunk with `the_tree_sits_beside_the_3d_canvas_and_holds_still`
merged (read its lesson: where the form sits, how the tree redraws). Scope:
`apps/annotate/` (the pick and write paths in `app.js`, `binding_state.js`,
the offer bar, `sweep.js`'s suggestion words, `style.css`), the shell's left
column where the form shows (`apps/viewer/views/nav.js`,
`apps/viewer/topology_app.js`, `apps/viewer/topology.css`),
`docs/ANNOTATION_SURFACE.md` (the gesture table and "Taking a suggested
face", "A hole pattern", "Proposals", rewritten to what you build), tests.
Do NOT touch: the contact engine and what it suggests; the event schema
(`feature-identity/v0`) and how the log folds; the map, grid and study
views; right-click menus and the bar over the canvas (the next link). Never
write to `C:\workspace\tolstack\data\inbox\feature-identity\`: every bind
you make goes into a scratch copy.

## Why it feels unpredictable (measured 2026-11-22; line numbers are "about", re-check)

One click does one of five things, and the page does not show which:

| What the click does | Path |
|---|---|
| Replaces the binding | a plain armed click (Pick a face, Correct): `apps/annotate/app.js:3723-3771`, `bindArmedFaces` :3829, `AA.planAnswer` (`binding_state.js:531-551`) |
| Replaces, and ends the pick whatever mode | any Take, including a mate line under an armed body (`views/nav.js:1132`): `cmdTake`, `app.js:5050`, disarms at :5085 |
| Replaces | the bind bar, `app.js:6693` |
| Replaces | re-clicking a held face whose surface has unheld siblings, `app.js:3738-3743` |
| Adds | Add a face (`nav.js:1178`; `adding`, `app.js:3347`) or Shift-click, via :3728 to `addArmedFace` :3778-3824, written as held ∪ {face, swept, offered} |

- Jeff's replaced Add a face is in his log:
  `0102`–`0104_hub_boss_in_tan_link_mount_pilot.json`. 0103 (nine faces)
  superseded 0102 (nine faces) through the replace writer; it carries no add
  marker. The previous chain's walk replayed it; read its review page
  (`docs/sessions/lessons/REVIEW_20261122_the_first_study_on_v2.md`,
  "Add a face, replayed") for the exact sequence.
- Correct sits beside Add a face, and every opened feature carries its own
  Correct / Add a face / Unbind row and a Remove per face: four faces cost
  about eleven rows (Jeff's screenshot).
- A click's expansion comes from `apps/annotate/face_geometry.js:1130-1158`:
  `swept` (same surface, touching), `offered` (same surface, apart),
  `pattern` (like holes).
- A pending pattern is confirmed in `#an-offer` (`app.js:3914-3946`;
  `style.css:583-595`: 12 px text in a bar at the top of the canvas). The
  tree has no field for it (`embedTree`, `app.js:7645-7653`).
- "agent suggested · high" is written at `sweep.js:2013` and rendered at
  `app.js:4494` with " · bound" appended; there is no condition on bound.
  Accept answers one proposal id (`binding_state.js:548-551`), so a proposal
  for the same face on a sibling edge stays open; seven bound v2 features
  carry one.
- An element row reads bound when either of its ends is
  (`binding_state.js:219-235`, `app.js:5942-5956`): Jeff's green "piston
  cover flange to feather stop face".
- Pinned today, to be rewritten with the behaviour:
  `docs/ANNOTATION_SURFACE.md:757-763`; browser checks at
  `scripts/run_viewer_browser_tests.mjs:8193`, `:11658`, `:11707`;
  `tests/test_hole_pattern.py:258`; `tests/test_rail_row_looks_are_paired.py`;
  `apps/annotate/run_tests.cjs:346-369`.

## Deliverables

1. **Editing a feature replaces the tree with its form.** Opened by a
   double-click on the feature's row, by the pencil on a hovered or selected
   row, or by Enter on the selected row. The form's head has the feature's
   name, a tick and an X; under it the part, and the feature it mates with
   where the model says. The tree is not on screen while the form is.

2. **The faces are a list you can see.** It opens holding the faces bound
   now. One line per surface, in words a person can check against the scene
   (a split surface is one line with its segment count; a pattern is one
   line with its hole count); face ids only on demand.

3. **A click in the scene puts a surface in the set or takes it out.** Every
   click, no mode, no modifier. A surface means all its touching segments.
   Same-surface faces that sit apart, and the other holes of a pattern, are
   offered as a suggested line (below), never taken unasked and never in a
   bar over the canvas: `#an-offer` retires.

4. **Preview both ways.** Hovering a face in the scene pre-lights it, as the
   real app does today: keep that. Hovering a line in the form, in the list
   or among the suggestions, lights that surface in the scene.

5. **A suggestion is a line.** Proposals, contact faces, mate rankings,
   same-surface and pattern offers all appear as lines under the list, best
   first, each with a few words of why. A click moves the line into the set.
   Where a suggestion came from is said only here, and never on a bound
   face; a bound face's history is behind a disclosure.

6. **Nothing is written until the tick.** The tick (and Enter) writes one
   event holding the whole set, superseding the previous binding as today's
   writers do, and answers every open proposal that names a face now bound
   on this feature. The X (and Esc) discards. A tick on an unchanged set
   writes nothing. Unbind is its own control in the form. A dismissed
   proposal is recorded at the tick with the rest, not on its own click.

7. **Tick and on to the next.** A second control beside the tick writes and
   opens the next unbound feature of the same part, so a part's features can
   be confirmed in a run. Jeff: "hopefully I can just rubber stamp most of
   the rest of them". Label it as a button, in a word or two.

8. **Leaving returns to the tree where it was**: the same row at the same
   place on screen, now wearing its new mark.

9. **Everything this replaces is gone, not hidden**: Correct, Add a face,
   Remove per face, the Unbind row in the tree, the bind bar, the armed-line
   states and the second mark vocabulary inside an opened feature (circles
   in seven states, diamonds in three). Nothing in the tree writes. A joint
   row no longer reads bound from one end: it counts its ends.

10. **Jeff's log reads as before.** No migration and no schema change: every
    existing event folds to the same binding it does today, checked on a
    copy of his log (115 files on 2026-11-22; it grows by his hand).

## Definition of done

- Browser checks in the existing suites (no new tier), on fixtures and on a
  scratch copy of the real log: two shoulders bound as one feature in four
  clicks or fewer after the form opens (click, click, tick); a pattern
  bound from one hole and its suggested line; a face removed from a bound
  feature; X leaves the log untouched; one event per tick; an unchanged tick
  writes nothing; a proposal for the same face on a sibling edge is answered
  by the tick. The node suites and default pytest green in the main
  checkout.
- **Looked at with vision**, scratch data root, scratch port, never 8000, at
  3840 and 1536 wide. Do Jeff's own three cases on the scratch copy and
  shoot each step: the tangential link mount's pilot (two shoulders, each
  split into segments), the gas spring mount's bushing bores, and the
  tangential link mount's fastener pattern. A filmstrip of open → pick →
  tick → back to the tree. Then click around as `CLAUDE.md` asks, and try to
  get lost: open a form, orbit, hover, change your mind, X.
- The lesson counts clicks for each of the three cases, before (today's
  page, from the previous walk) and after.
- Jeff's real log unchanged by you (count and hash before and after).
- Lesson (`docs/sessions/lessons/LESSONS_20261122_editing_a_feature_opens_its_form_where_the_tree_was.md`):
  the five old paths and what each became; what the form does that the
  sketch does not show, and why; anything of today's page you could not
  carry into the form, filed and named; what the next link's menus should
  call.
