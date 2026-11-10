---
priority: high
depends_on: []
model: fable
hitl: false
---

# HANDOFF 2026-11-10 — the_model_is_derived_once_and_the_left_column_is_its_tree: one model object, and the left column rebuilt from it (F1a)

Source: Jeff's forge note `20261109T222516_f7jdsi` and the strategy session of
2026-11-09/10 that read this codebase for him
(`C:\workspace\dispatch\docs\strategy\drafts\DRAFT_tolerance_analysis_over_the_kinematic_model.md`,
section "2026-11-09 — the fresh read" — read it first; its twelve findings are
the reason for every item below). Baseline: `integration` at `556afdf3` or
later (it carries the three 2026-11-09 handoffs `master` does not). Scope:
`tolerance_stack/` (a new module), `scripts/build_topology_projection.py`,
`apps/viewer/views/nav.js`, the nav and grid-grouping parts of
`apps/viewer/topology_app.js` and `apps/viewer/topology.js`, a new
`apps/viewer/model.js`, the pane's header in `apps/annotate/`, names in
`docs/topologies/topology_vpa_end_stop_v2.json`, the `title` of
`topology_vpa_pitch_linkage.json`. Do NOT touch: how the DAG is laid out or
drawn (rails, blocks, pins, leaders — Jeff is keeping it and refining it
later); the page's layout and scroll model (`topology.css`'s shell, the next
handoff's); `tolerance_stack/kinematic.py`; the feature-identity event schema;
any node, edge, part or body **id** (the sweep and Jeff's bindings key on
them).

## Why

The page has no object that is the model. "Which part is in which body, which
rows are one part, which part owns a face two parts share" is answered by at
least nine different rules (`topology.js:3132, 3205, 3579, 4159, 4421`;
`apps/annotate/app.js:1716`; `apps/annotate/sweep.js:1272, 1308, 1318`), and
the left column, with the 3D pane open, is a scrape of the pane's hidden rail
(`apps/annotate/app.js:6053-6330` → `views/nav.js:360`). Jeff spent hours
typing a redesign of that menu and then found most of it existed behind a row
labelled "Kinematic model". This handoff gives the page one model and makes
the left column its first reader. Jeff's direction, 2026-11-09: a model is the
set of entities in the workspace; studies (kinematic, tolerance, later thermal
and others) are typed, scope a subset of it, and run side by side.

## Deliverables

1. **The model, derived once, in Python.** A new pure module (suggestion:
   `tolerance_stack/model_view.py`) turns a loaded `Topology` into the entity
   view, and the topology projection carries it per topology (suggestion: a
   `model` block beside `bodies` in
   `C:\workspace\tolstack\data\projections\viewer\topologies.json`, so neither
   app needs a new fetch). Entities:
   - **bodies**, in authored order, each listing its **parts** in authored
     order;
   - a part's **features**: every node the part is on, *as seen on that part*
     (a node on two parts is two features, one per part);
   - a part's **dimensions**: the structural edges on it, each naming its two
     features;
   - **interfaces**: one list for the two authored shapes — a node on two
     parts (a contact) and a gap edge (a joint, fit or clearance) — each with
     its two ends as features, its kind, and whether both ends are in one body
     or which two bodies it joins;
   - per part: number, name and one label (item 5), mesh and occurrence facts
     the projection already resolves.
   Use `Topology.body_of` / `node_bodies` / `edge_body`
   (`tolerance_stack/topology.py:986-1147`) — do not write a second membership
   rule. Pin v2 value by value: 5 bodies, 15 parts, 34 features (25 nodes, 9 of
   them on two parts), 22 dimensions, 17 interfaces (9 contacts + 8 gaps), of
   which 8 join two bodies and 9 sit inside one (ground 5, pitch plate 3,
   blade 1). Those counts are the strategy session's own derivation
   (`C:\workspace\dispatch\docs\strategy\drafts\mockups\tolstack_shell_20261109\template.html`,
   `buildModel`); if yours differs, the lesson says which number and why.
2. **One model object in the browser.** Built once per loaded projection
   (suggestion: `apps/viewer/model.js`, pure, no DOM), with the lookups the
   surfaces need. Everything this handoff writes or rewrites reads it; none of
   it reads `nodes[].parts`, `edges[].part` or `bodies[].parts` to decide
   membership again. The DAG's existing derivations stay as they are — moving
   them onto the model is a later handoff, and the lesson lists which
   functions still derive on their own so that handoff has its inventory.
3. **The left column is the model's tree.** Jeff's structure, top to bottom:
   - the title, then a **model picker** (a dropdown): the two models, then any
     analysis that belongs to neither. Choosing a model shows that model and
     nothing of the other.
   - **Rigid bodies**, each opening to **Parts** (each part opening to its
     features) and **Interfaces** (those inside the body, each opening to its
     two ends, named `<part> · <feature>`).
   - **Joints between bodies**, listed once, each opening to its two ends.
   - **Studies**: the model's studies. On v2 today that is one row that plays
     the sweep (what the "Kinematic model" row does now — give it a name that
     says so); on v1 its existing study rows. Selecting a study never
     restructures the tree above it.
   - One status mark per feature — bound, suggested, or none. The coloured
     circle and the warning triangle are one mark now. **No
     all/unbound/bound filter** (Jeff, 2026-11-09: a part has a handful of
     features; the mock-up's filter buttons are not wanted).
   - Show/hide for a body and for a part sits on its own row (the verbs the
     sweep rail's checkboxes use today).
   - The bottom layer Jeff asked for — the suggested and selected faces of
     one feature, with their reason badges — appears under that feature when
     it is selected, and only there. Suggestion: the pane already narrows its
     rail to the entered element; mirroring that one subtree under the
     selected row is acceptable for this handoff. Say in the lesson what you
     did.
   - Gone from the column: the Models list that jumps, the `component`
     chip, the "All 30 interfaces — no study scopes them" list, "In this
     model" / "Other parts (N)", and the Stacks section on a model those
     stacks are not part of.
   The reference for look and nesting is the left column of
   `C:\workspace\dispatch\docs\strategy\drafts\mockups\tolstack_shell_20261109\index.html`
   (Jeff: "the left hand menu looks significantly improved the way you have
   it"). Only its left column — its DAG and grid are not the target.
4. **The pane's top bar never goes away, and binding has an exit.** The play
   controls stay as a collapsible element in both pane modes. While a feature
   is being bound, a strip names it and carries an ✕ that leaves binding and
   returns to the sweep if one was playing. Today the only way back is a bar
   that exists after some exits and a console verb (`apps/annotate/app.js:1358,
   1500-1537`).
5. **A thing is named one way.**
   - Model titles: v2 is "Propeller Pitch System"; v1 is "Propeller Pitch
     System (legacy)".
   - One rule for a part's label, applied on every surface of the same kind.
     Today a block reads `214373-002` beside one reading "Pitch plate…",
     because three v2 parts carry a `display_name` and twelve do not.
   - v2's feature names say the feature: no "axis" (Jeff: "we aren't really
     selecting an axis, we're selecting a feature (GD&T conventions)"), no
     part name inside a name that is already nested under its part, one
     spelling of each term ("locating-boss" and "locating boss" sit on
     adjacent lines today). Dimension names agree with the features they
     join. Names only; ids are frozen.
6. **The grid draws a part once per run of its rows.** `VA.gridPlan`
   (`apps/viewer/topology.js:4421`) breaks a group at any boundary node
   (`:4508`), so v2's hub is 1 + 3 rows in two brackets, the tan-link mount
   1 + 2, the gas-spring mount 1 + 1 + 1, the pitch plate 1 + 1: 18 part
   groups for 12 parts. Break only where the part changes. Row order is
   untouched. v2 then shows 12 part brackets; where v1's walk revisits a
   part, it still gets one bracket per visit, and the lesson says how many.

## Tests and guards

This repo pins its structure hard (799 mutation-witness specs anchored on
verbatim source lines; per-source guard counts). Follow the repo's rules, and
keep what you add small: value-level tests for the Python view and the model
object; browser checks only for behaviour a reader can see. A witness whose
behaviour this handoff deliberately removes is retired with a sentence, not
re-anchored onto different code. No new refusal, gate or pin beyond what the
repo's own enrolment rule requires. Record in the lesson how many specs you
re-anchored, retired and added — that number decides how the next handoffs
are cut.

## Definition of done

- **Looked at, on the merged tree.** Port 8000 serves `master`; serve this
  tree's `apps/` over the main checkout's `data/` on a private port, as
  `tests/debug_integration_walk_20261108.mjs` does, with projections rebuilt
  from this tree. Shots at 3840×2160 and 5120×2160 (Jeff's two monitors) in
  `docs/sessions/lessons/shots/<slug>/`, read with your own eyes before the
  lesson is written:
  - v2 with the pane closed, and open: the tree, a body open to its parts and
    interfaces, one feature selected with its faces beneath it;
  - v2 playing the sweep, then a feature selected, then ✕ — back in the sweep;
  - the model picker switched to v1 and back: nothing of the other model
    remains, and v1's tree is built by the same code;
  - the grid on v2 with 12 part brackets.
- **One path for both models.** The new code contains no branch on a model's
  id or shape (`ids_from`, `walk_order`, has-studies, `occurrence`); the
  lesson shows the grep.
- The repo's suites green in the main checkout per `CLAUDE.md`, projections
  rebuilt first.
- Lesson (`docs/sessions/lessons/LESSONS_20261110_the_model_is_derived_once_and_the_left_column_is_its_tree.md`):
  the model block's shape as shipped; the inventory of functions that still
  derive membership on their own; what the faces layer under a selected
  feature is built on; the witness counts above; anything on the page that
  now disagrees with the tree, filed as issues rather than fixed here.
