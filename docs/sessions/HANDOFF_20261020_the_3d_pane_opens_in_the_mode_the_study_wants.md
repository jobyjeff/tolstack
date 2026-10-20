---
priority: high
depends_on: [the_viewer_shows_a_kinematic_study, the_annotator_rail_resizes_and_names_what_it_lists]
model: opus
---

# HANDOFF 2026-10-20 — the_3d_pane_opens_in_the_mode_the_study_wants: the flyout becomes a pane that stays, follows the selected study into sweep or bind mode, and highlights what the table points at

Source: strategy session 2026-10-20, Jeff's lock: one shell — "the viewer
page is the shell, the annotator is the one 3D scene, embedded". Hosted from
drawing-checker's mounts (`/tolstack/viewer/`, `/tolstack/annotate/`); the
tolstack `serve` verb stays what `ops.toml` already calls it, a dev fallback,
and no separate server is part of the daily surface. Baseline: `integration`
with the two handoffs in `depends_on` merged. Scope: `apps/viewer/`
(`topology_app.js`'s flyout, `topology.html`'s `#annotate-flyout`,
`topology.css`'s flyout rules, `viewer.js`'s link/exec mirror, tests) and
`apps/annotate/` (two new commands and the message listener, tests). Do NOT
change the annotator's rail contents (the next handoff owns the sweep-mode
rail), the bind flow, or anything in drawing-checker.

## What exists

- The flyout (`study_3d_flyout`, 2026-09-10): a non-modal `<dialog
  id="annotate-flyout">` pinned beside the graph, one iframe created lazily
  and **kept** across launches (`launchAnnotate(params)`, `topology_app.js`
  ~1030), later launches posted as `{type: "annotate:exec", command}` to the
  annotator's listener (`apps/annotate/app.js` ~2720), `body.flyout-open`
  makes the page yield room, a divider resizes it (`resizeFrom` kind
  `flyout`), "Open full page" out-link, Close button. It opens only from a
  row's "attach to 3D" / detail links; it closes on navigation away in
  effect because nothing re-drives it.
- `VA.annotateLink(params)` / `VA.annotateExecCommands(params)` mirror each
  other by hand (`goto`, `isolate`, `trace`; `sweep` added by the previous
  handoff). The annotator's verbs: `goto <topology> <edge> <study>`,
  `isolate <part>`, `trace`, `sweep <run-id>`, `select-edge`, `select-face`,
  `deselect`.
- `scene.highlightFace(sha256, faceId)` / `clearHighlight()` /
  `highlightedFace()` exist in `apps/annotate/scene.js` (~645) — the hover
  tint — but no command reaches them from outside.
- A binding (`feature-identity/v0`) keys on `{topology_id, edge_id}` and
  resolves to `(sha256, face id)` through the identity projection the
  annotator already loads (`AA.findBindingRecord`).

## Deliverables

1. **The flyout is a pane.** Same element, new posture: once opened it stays
   open across nav changes within the page (study to study, topology to
   topology) and remembers open/closed and width per browser
   (`localStorage`, try/catch, the width key the divider already uses).
   Opening it needs no row: a head control on the page ("3D") opens it on the
   current selection. "Open full page" and Close stay. The dialog's `show()`
   (not `showModal()`) and `body.flyout-open` rules stay; the page's own
   grid is what yields, as today.
2. **It follows the selection into the right mode.** When the pane is open,
   selecting a **kinematic study** posts `["sweep", <that study's run id>]`;
   selecting a **chain study** or an edge posts the `goto` the row would have
   posted, which also leaves sweep mode (the annotator's `leaveSweep` path);
   selecting the kinematic **model row** posts `sweep` on the newest run.
   The same rule for a cold open: the pane boots with `VA.annotateLink` of
   the current selection. One function decides the command for a selection
   (`VA.annotateExecCommands` extended, with its mirror and both tests),
   never a second table in `topology_app.js`.
3. **Hover crosses the seam.** Hovering a contributor row on the kinematic
   page, or a rail row / edge on a chain study, posts a new annotator command
   `highlight <topology> <edge>` that resolves the edge's binding and calls
   `scene.highlightFace`; leaving posts `highlight clear`. An edge with no
   binding highlights nothing and the annotator answers with its usual
   console line, never a banner. In sweep mode the highlight applies at the
   current frame (a tint on a moving part is fine; the pick gate is about
   binding, not viewing). Pointer-move frequency: debounce in the viewer so
   the iframe gets at most a few messages a second.
4. **The page says what the pane shows.** The pane head reads the mode and
   the subject in one line ("Sweep — vpa pitch chunk2 p2" / "Binding —
   pitch link grip length"), from the annotator's reply to its own command
   (add an `annotate:state` message the annotator posts back after a
   `sweep` / `goto` completes, carrying mode, topology, study/run). No text
   in the viewer composes that from the viewer's own state.

## Definition of done

- Browser TRUTH tier, served beside the annotator (the mount or the apps/
  tree): open the pane from the kinematic study page → the annotator is in
  sweep mode on P2 (`sweep-tip` present, the bar's run label read back);
  select a chain study in the nav → the annotator is in bind mode on that
  study (sweep bar gone, element list present); reload → the pane reopens at
  its width; hover a contributor row → the annotator reports a highlighted
  face for a bound edge and nothing for a gap row.
- `node apps/viewer/run_tests.cjs` and `node apps/annotate/run_tests.cjs`
  green in the main checkout; the hand-mirror tests cover the new params;
  `venv-win/Scripts/python.exe -m pytest -q` green but for the documented
  worktree-only red.
- The hosted bake needs no new mount (say so in the lesson after reading
  drawing-checker's `tolstack_mounts()`; both apps are already copied).
- Lesson (`docs/sessions/lessons/LESSONS_20261020_the_3d_pane_opens_in_the_mode_the_study_wants.md`):
  the message vocabulary both ways (`annotate:exec` in, `annotate:state`
  out), the debounce figure, what the pane cannot do on file:// (and that it
  says so), and what the sweep-rail handoff needs.
