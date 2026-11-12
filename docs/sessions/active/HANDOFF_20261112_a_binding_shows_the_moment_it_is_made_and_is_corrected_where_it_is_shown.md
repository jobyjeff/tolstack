---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-12 — a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown: the page reads the binding log, a bound feature says what it is bound to, and a wrong binding can be corrected or removed from the tree

Source: Jeff's forge note `20261112T114449_f3anmp` (2026-11-12), last paragraph:
"I bound the tangential link mount base face (the suggestion was correct), but
now the collapsible element is empty, expanding it does nothing. If I had made a
mistake I'd have no way to correct it. Also, the 'tangential link mount base
face' feature seems to exist in both the hub assy and the tangential link mount
assy… the bound face is part of the hub so it shouldn't be showing up in the tan
link mount… Now that I've bound a few faces, I am seeing that they show
permanently colored green. Worth noting I've bound faces in the past, and they
seem to keep getting wiped any time we do code updates, at what point is it
going to be stable enough that I can go through and bind all of them?"
Strategy record: `dispatch/docs/strategy/HANDOFF_20261112_strategy.md`.

Baseline: `integration` at or after `0dfe1bdd` (it carries
`the_pane_follows_the_one_selection_both_ways`, which `master` did not have when
this was written — line numbers below were read on `master` and will have moved
in `apps/viewer/topology_app.js` and `apps/viewer/views/nav.js`; the function
names are the anchors). Scope: `apps/viewer/`, `apps/annotate/`,
`tolerance_stack/feature_identity.py` (the verdict vocabulary only),
`scripts/js_vocabulary.py` and the generated vocabulary, docs
(`docs/ANNOTATION_SURFACE.md`), tests. Do NOT change how a binding is keyed
(an edge end today; re-keying to the feature is a later handoff and migrates the
log once), do NOT touch the DAG's or the grid's layout, and do NOT edit
drawing-checker.

**The real log is Jeff's work. Never write a test event, a retraction or a
correction into `C:\workspace\tolstack\data\inbox\feature-identity\`.** Every
write this handoff exercises goes to a scratch `--data-root` / a scratch folder
grant. Reading the real log is expected.

## What was measured (2026-11-12, main checkout)

- **Nothing was ever wiped.** A binding is one immutable file in
  `C:\workspace\tolstack\data\inbox\feature-identity\NNNN_<edge>.json` (78
  files; gitignored, append-only). Both apps read only the fold,
  `data\projections\feature-identity\bindings.json`: the pane at
  `apps/annotate/storage/http.js:91-94`, `storage/fsa.js:77-79`, `app.js:6444`;
  the viewer tree at `apps/viewer/topology_app.js:582-592`, once at load. A new
  write lives only in memory (`state.sessionEvents`, `app.js:5624`, merged at
  `app.js:4800-4808`).
- On 2026-11-12 the fold was a day old (built 11-11 21:06, 75 events) and Jeff's
  three binds of that morning — `0076_hub_spindle_to_tan_link_mount_face_accepted`,
  `0077_hub_boss_in_tan_link_mount_pilot`, `0078_hub_blade_axis_offset` — were on
  disk and in no projection, so a reload hid them. The strategy session re-ran
  `scripts/build_feature_identity_projection.py`: 78 events, 15 bound, 53
  proposals open.
- **On the mount at 8000 the tree never sees a binding at all:**
  `apps/viewer/storage/http.js:57-58` has `identityFile: null`, and the pane
  sees one only while a folder grant is READY (`apps/annotate/app.js:6767-6770`).
  This is what "wiped after code updates" is. `HANDOFF_20261108_the_bindings_projection_folds_the_events_jeff_accepted`
  treated the same symptom by putting the fold on the rebuild rail; the page
  still does not ask for it.
- drawing-checker's mount already has a rebuild route (`POST /tolstack/rebuild`,
  `GET /tolstack/rebuild/status`, in its `webui/tolstack_rebuild.py`), which
  runs the whole `scripts\rebuild_projections.ps1`. Step 5 of that script
  (`build_feature_identity_projection.py`) alone takes seconds.
- **The empty body.** A feature's body is the pane's rows whose key names the
  node (`views/nav.js:707-724`, `topology_app.js:2116-2128`). In sweep mode only
  `#sweep-tree` is mirrored (`apps/annotate/app.js:6166-6170`) and
  `tan_link_mount_hub_face` is in no sweep run, so there are no rows; in bind
  mode the element row drops an end with no candidates (`app.js:4948-4950`) and
  an accepted proposal leaves the candidates (`sweep.js:1840-1843, 1923`). The
  twisty is drawn whenever the scene is open (`nav.js:241`) and empty rows
  render nothing (`nav.js:738`). Open issue, same defect:
  `docs/issues/ISSUE_20261111_a_feature_the_newest_sweep_does_not_carry_opens_to_an_empty_body.md`.
- **Correction exists and cannot be reached.** Flip direction and Correct this
  binding are in the pane's bind-mode bar (`app.js:5635-5690`); sweep mode
  replaces that bar (`app.js:5140-5142`) and it is never mirrored into the tree.
  A re-pick supersedes the end's standing binding only on a sweep joint end
  (`sweep.js:2431-2443`). There is no unbind: the verdict vocabulary has no
  retraction (`tolerance_stack/feature_identity.py:118`, `sweep.js:2429-2430`).
- **One face under two parts.** The model is right: a node on two parts is two
  features, `<part>@<node>` (`tolerance_stack/model_view.py:148-161`), and event
  0076 binds the hub's side (`hub_spindle_to_tan_link_mount_face` is a hub
  dimension ending on `tan_link_mount_hub_face`, `topology_vpa_end_stop_v2.json:448-454`;
  the mount's side is `tan_link_mount_height` / `tan_link_mount_overall_height`,
  `:475-508`). Three readers drop the part and take every edge at the node: the
  status fold (`apps/viewer/model.js:57-72`), the rows (`edgeIdsAtNode`,
  `topology_app.js:2103-2109`), and hover/inspect (`data-node-id`,
  `jointEndAtNode`, `nav.js:240`, `topology_app.js:2167-2178`).
- **The green.** `MARK_COLORS.bound` (`apps/annotate/scene.js:56`), intent "a
  face already bound stays marked throughout" (`scene.js:33-35`), applied only
  after a sweep accept or pick in this session (`app.js:4118`); the clears skip
  it (`app.js:1179-1181, 1256-1258`). So faces bound today pile up green and
  faces bound last week are never marked.

## Deliverables

1. **The page reads the log, not yesterday's fold.** After a bind, an accept, a
   reject, a correction or an unbind: (a) the tree's status mark, the feature's
   body and the pane's marks change at once, with no reload; (b) a reload of the
   viewer on `http://127.0.0.1:8000` shows the same state, with no manual
   rebuild, and **reading needs no folder grant**. Sites: the viewer tree on
   http and on file, the pane on http and on file, sweep mode and bind mode.
   *Suggested, investigate and report:* give the viewer's http adapter the
   served `bindings.json`; have the pane publish its merged record (fold plus
   session events) to the shell on every write; and after a successful write ask
   the mount to refold. If the existing full-rebuild route is too slow to call
   per write (measure it), fold in the page instead when the events directory is
   readable, and file a drawing-checker issue for a narrow refold route — do not
   edit drawing-checker here.
2. **A feature belongs to one part.** The status fold, the feature's rows and
   hover/inspect take only the edges whose part is the feature's part (for a gap
   edge, its end part — `model_view.py:128-130`). After it: binding the hub's
   side of `tan_link_mount_hub_face` marks the hub's feature bound and leaves
   the mount's feature unbound and pickable, and hovering the mount's row lights
   nothing on the hub.
3. **A feature's body always says something, and has no twisty when it has
   nothing to open.** In both modes, with or without a sweep loaded:
   - bound → one line, `bound · face <id> of <part number>`; hovering it lights
     that face; two actions, **Correct** (arms the CAD-style pick of
     `docs/ANNOTATION_SURFACE.md`, "Picking a face — the gestures", on the
     feature's own part; the new pick supersedes) and **Unbind**; **Flip** where
     a direction applies.
   - suggested → the candidate list as today.
   - neither → `not bound` and **Pick a face**, which arms the same pick on the
     feature's own part. It works for a feature the loaded sweep run does not
     carry (v2's own nodes on the P2 run); the event is keyed as events are
     today, on the feature's first own edge end.
   This closes the 11-11 issue above by its second shape (a body from the
   model's own status), with the pick the issue left out.
4. **Unbind is an event.** A retraction verdict joins the verdict vocabulary
   (the Python constant, the generated JS vocabulary, `docs/ANNOTATION_SURFACE.md`);
   it names the event it retracts, folds hide the retracted binding, history
   keeps it. The fold's counts line gains a `retracted` figure.
5. **Every standing binding of an open part is marked, from the record.** On
   each refresh the pane marks the bound faces of the parts it has open from the
   merged record — this session's and every earlier one's — and a **Bound
   faces** show/hide control sits in the pane's top bar, on by default. No mark
   is applied by the accept path alone.
6. **A binding that names something gone is said, once, as a warning.** A
   standing binding whose edge id is in no loaded model, or whose mesh sha is
   not installed, is counted in one line at the foot of the tree ("2 bindings
   name something that no longer exists"), opening to the list. It refuses
   nothing. The outcomes it answers: `gas_spring_mount_hub_face` left v2 on
   2026-11-10 with no reader noticing whether a binding sat on it; the
   2026-10-01 mesh re-key orphaned bindings by a directory rename. The payer for
   a misfire is Jeff reading one extra line.

## Definition of done

- On the end-stop model (v2) at `http://127.0.0.1:8000/` — the viewer's one URL
  on drawing-checker's mount — against a **scratch copy** of the log: bind a
  face, reload, and it is there in the tree and green in the pane; Correct it to
  another face; Unbind it; each step reloaded once. Shots of each step at
  3840×2160 in `docs/sessions/lessons/shots/<slug>/`, each one looked at. If
  8000 is not serving when the session runs, say so, show what the dev fallback
  on 8843 can show, and name exactly what was not demonstrated.
- Against the real projection, read-only: the hub shows
  `tan link mount base face` bound and the tangential link mount shows its own
  side unbound; no feature row in v2 has a twisty that opens to nothing (walk
  every part and count).
- The exploratory click-around the repo requires for a viewer change, shots kept.
- Tests: value-level for the retraction fold and the per-part status; the
  default `pytest -q` once; `node apps/viewer/run_tests.cjs` and
  `node apps/annotate/run_tests.cjs`; the browser runner with `--only` for each
  suite added or changed; the witness runner with `--only` for each spec added
  or changed. Not the whole browser tier and not the whole witness gate.
- Lesson (`docs/sessions/lessons/LESSONS_20261112_a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown.md`):
  which refresh mechanism was chosen and its measured time per write; what the
  re-keying handoff (a feature bound once, to a set of faces) will find already
  done and what it must still migrate; any binding in the real log the orphan
  line names.
