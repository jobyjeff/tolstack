# LESSONS 2026-09-06 — annotation_surface_mvp

Select geometry, tag it with a stack element's identity — no measurement.
Full suite green: `636 passed, 1 skipped` (pytest), `150/150` (`apps/viewer/
run_tests.cjs`, unaffected), `20/20` (`apps/annotate/run_tests.cjs`, new).

## The event schema as shipped

`tolerance_stack/feature_identity.py`, schema `joby.tolerance_stack/
feature-identity/v0`. One immutable event binds a **stack-side key**
(`topology_edge`: `topology_id`+`edge_id`, or `stack_element`: `stack_id`+
`element_id` — one identity namespace with the DAG topology model, no third
vocabulary) to a **geometry-side key** (`source_step_sha256`+`face_id`, plus
the face's `area_native2`/`centroid_native` fingerprint) via `verdict:
"bound"`, or records `verdict: "owner_not_in_set"` with no geometry at all.
`direction` (`"from"`/`"to"`, reusing `topology.Edge`'s own words),
`composition_note`, `owner_part`/`owner_path` (`direct`/`hypothesis`),
`gdt_modifier` (`"M"`/`"L"`), and `general_tol_regime` round out the fields
the brief's decisions 3-5 asked for. `build_projection` folds the log into
per-stack-key bindings + history; `revalidate`/`revalidate_projection` do the
staleness re-check (fingerprint match against a replacement mesh's
manifest — `"confirmed"` / `"needs_re_confirmation"`, never a silent re-bind,
never a drop).

**Full DoD demonstration run against real data**, done and then cleaned up
(see "cleaned up" below) rather than left in the shared main checkout:
bound `pitch_system/end_stop_clearance` to two real faces of the real
213668-002 mesh (`data/meshes/6d5b1321.../`), recorded
`pitch_arm_link_hole_to_clocking_hole` as `owner_not_in_set`, and re-validated
against a synthetic perturbed manifest — the projection came back with the
edge `bound` (2 bindings), the other edge `owner_not_in_set`, and one of the
two bindings flagged `needs_re_confirmation`, the other `confirmed`. Exactly
the three outcomes the DoD names. I deleted the demo event files and the
rebuilt projection afterward: they were fabricated for the demonstration
(I picked which face is "the stop feature" from a centroid glance, not real
engineering judgement), and this repo's whole culture is "nothing invented" —
leaving synthetic identity claims sitting in the shared, gitignored
`data/inbox/feature-identity/` where a future session or Jeff himself might
mistake them for real bindings would be exactly the kind of drift the rest of
the repo works hard to prevent. The commands to reproduce the demonstration
are in this lesson's git history (this file's own diff) if a reviewer wants
to re-run it.

## Scope decisions not spelled out in the handoff

- **`apps/annotate/`'s UI wires only the `topology_edge` path today.** The
  schema and fold fully support `stack_element` keys too (built and tested —
  `tests/test_feature_identity.py` exercises both), but the app's element
  list enumerates a study's `selection` (topology edges), because the DoD's
  own worked example is a pitch-system study and the two stack-build
  handoffs staged next (endstop, stroke) are DAG studies per the strategy
  brief's own framing. Wiring a `stack_element` picker (reading
  `results.json`'s elements instead of `topologies.json`'s edges) is a small,
  additive follow-up, not a redesign.
- **No supersession/correction mode**, unlike `docs/spec_library/`'s
  `correction` events. Every `bound` event is a fact that stands; many-to-many
  already absorbs "a changed mind" (add a new binding) without needing a
  retraction concept. If a real need for one arrives, it's a schema
  extension.
- **`data/inbox/feature-identity/` is gitignored**, unlike
  `docs/spec_library/events/` which is committed. Spec-parse events are
  hand-authored one at a time by an agent following a procedure; these are
  generated continuously by an interactive app, so I gave them the ordinary
  inbox-stream disposition (filesystem-canonical, main-checkout-only) rather
  than inventing a reason to diverge from every other `data/inbox/*`
  directory. Flagged in `data/inbox/feature-identity/README.md` as a call
  that could be revisited if losing an uncommitted binding turns out to cost
  something in practice — the schema doesn't change either way, only where
  the files live.
- **No JS/Python vocabulary-pairing test** for `apps/annotate/
  binding_state.js`'s hand-copied constants (`STACK_KEY_KINDS`, `VERDICTS`,
  `DIRECTIONS`, `GDT_MODIFIERS`), unlike `tests/test_js_python_vocabulary.py`'s
  pairing for `apps/viewer/viewer.js`. That test module is hand-scoped to one
  file (`VIEWER_JS`); extending it to a second app's file is a natural
  follow-up, not built here given the size of everything else in this
  handoff. `run_tests.cjs` at least asserts the JS constants' literal values
  match what's written in this lesson and in `feature_identity.py`'s
  docstring, which catches a value-level drift, just not a structural one.
- **`apps/annotate` is ES modules; `apps/viewer` is classic scripts.** Not an
  oversight — `scene.js`'s docstring has the full argument: this app already
  cannot run from `file://` (no FSA, no binary `fetch()` there either), so
  the one reason `apps/viewer` avoids ES modules doesn't apply here.

## Mesh fixtures: rotorkit's `master` doesn't have the tessellation code

The handoff said "run rotorkit's tessellation from its main checkout" —
rotorkit's main checkout (`C:\workspace\rotorkit`) sits on `master` @
`63c14c4`, and that commit is a pure board-move rename with none of
`step_tessellation_spike`'s actual content. The real code
(`rotorkit/stepgeom/tessellate.py`, `scripts/tessellate_parts.py`, the spike's
vendored three.js) only exists on rotorkit's `integration` branch, at
`0bcbca0`. Filed as
`docs/issues/ISSUE_20260906_rotorkit_master_missing_tessellation_spike.md` —
this is the same board/lineage-divergence shape this repo's own
`ISSUE_20260904_board_move_commit_unreachable_from_integration.md` already
named, just in rotorkit.

**Worked around without touching rotorkit's main checkout**: `git worktree
add ../rotorkit-tess-tmp integration` (a temporary worktree, cut from
rotorkit's own repo, never rotorkit's checked-out main tree), ran
`scripts/tessellate_parts.py` there with rotorkit's own venv against its own
`data/` fixtures (which the script defaults to the main checkout regardless
of which worktree runs it — see the script's own `MAIN_CHECKOUT` constant),
copied the two single-part outputs into tolstack's `data/meshes/`, renamed
per this repo's contract (`data/meshes/README.md`), and removed the temporary
worktree (`git worktree remove`) once done. **The bonded-assembly proxy
(26-solid, 119 MB) was measured by the run but deliberately not installed**
into `data/meshes/` — the MVP posture is single parts side by side, and
installing a fixture nothing in this session's app or tests exercises would
be gold-plating.

## The placement-transform gap (for the next annotation-surface or
rotorkit session)

Every fixture the tessellation spike had was a single-part OML or one
non-hierarchical bonded sub-assembly — nothing exercised a real multi-part
assembly's placement transforms. `apps/annotate/scene.js` lays parts out
side by side at their own local origin (the spike's own layout choice,
reused unchanged), which is honest about what this MVP does and does not
prove. If a future session wants an assembly rendered in its real relative
placement, that needs its own validation against a real top-level assembly
STEP — not inherited from anything built here. Recorded in
`docs/ANNOTATION_SURFACE.md` and `apps/annotate/README.md` too, not just
here, since it's a fact about the shipped surface, not only a session note.

## What the endstop/stroke stack-build handoffs should consume

They are staged next per the strategy brief and will bind their unresolved
rows through this surface. What they need to know, concretely:

- Open `apps/annotate/index.html` (served, not `file://` — see its README),
  connect the tolstack repo root with **read/write**, pick the
  `pitch_system` topology and the relevant study, open the 213668-002 and/or
  blade-OML mesh (today's only two installed fixtures — anything else needs
  a rotorkit tessellation run first, see `data/meshes/README.md`).
- A binding never overrides a drawing citation: if an element already shows
  `confidence` other than `no_source_ref` in the topology projection, the
  detail pane says the drawing wins. Bind anyway if the identity is still
  worth recording (many-to-many; a binding doesn't have to be the stack's
  value source to be useful documentation of *which* feature the row means).
- After a session's bindings land in `data/inbox/feature-identity/`, rebuild
  the projection (`scripts/build_feature_identity_projection.py`) before
  trusting `data/projections/feature-identity/bindings.json` — same
  wipe-and-rebuild-from-committed-input discipline as every other projection
  here.
- A part not yet tessellated is a `rotorkit` ask, not a tolstack one: run
  `scripts/tessellate_parts.py` from rotorkit's `integration` worktree (see
  the issue above for why not `master` yet) against the new STEP file, then
  install its four output files into `data/meshes/<sha256>/` per
  `data/meshes/README.md`'s recipe (no automated copy script exists yet —
  noted there as the natural next tool if this becomes routine).

## Small gotchas

- **This machine's Bash tool persists `cd` across calls.** Running `cd
  /c/workspace/rotorkit && …` in one call leaves the *next* call's relative
  paths resolved against rotorkit, not this worktree, until another `cd`
  changes it back — bit me once (`cd apps/annotate` failed with "no such
  directory" because cwd was still in rotorkit from three tool calls
  earlier). Prefer absolute paths, or a trailing confirmatory `pwd`, across a
  sequence that hops between repos.
- **Python isn't on `PATH`** as a bare `python3`/`python` on this box (the
  Windows Store alias intercepts it) — always the full
  `venv-win\Scripts\python.exe` (or rotorkit's, for the tessellation run).
