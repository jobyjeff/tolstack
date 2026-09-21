---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-21 — annotate_hint_bar_and_context_autofilter: the hint pane becomes a top bar; entry context pre-selects everything it can

Source: Jeff, strategy session 2026-09-21, using the 3D annotator through the
viewer flyout (screenshot on file): (a) "the 'Pick an element on the left,
then click a face in the 3D view to bind it.' has a vertical divider, so it
takes up half of the usable 3d canvas. Make it a horizontal divider so it's
just a single line at the top. Could even be a collapsible 'commands' element
that gives general help." (b) "When you open the 3d viewer for a given
tolerance or feature, you already know the 3d body, the topology, the study,
the component, etc, so all of these should be filtered automatically.
Arguably the entire left menu is pre-selected if you access the 3d menu via a
node/edge of the tolerance stack, and user can just be given simple
instructions (ie select the two faces that define the bushing length…). …the
left side menu should have an 'auto-filter' menu at the top which lets you
enable/disable different parts of the selection algorithm (checkboxes to
auto select topology, study, part)."
Baseline: trunk `master` with the 2026-09-18 batch merged. Scope:
`apps/annotate/` + its tests; `apps/viewer/` ONLY if the deep-link needs a
new parameter, and then only `VA.annotateLink` / `VA.annotateExecCommands`
and their pinned tests (the URL contract is documented in
`apps/viewer/README.md` §"Deep links in"). Do NOT touch the viewer nav or
leader code (owned by the parallel `viewer_nav_alert_badge_and_angled_default`).

## What already exists (don't rebuild)

- The deep link already carries `topology` / `study` / `edge` / `isolate`
  (`apps/annotate/app.js:897-903`; built by `VA.annotateLink`).
- Part show/hide/isolate and the command layer (every action is a named
  command through `AA.exec` — the standing everything-is-a-command rule,
  `docs/strategy` draft `DRAFT_annotation_roadmap.md` records it) shipped in
  `annotate_deep_link_and_part_filter` (2026-09-08).
- The rail can scope to one element (`filter-element`, 2026-09-16) and rows
  carry the consolidated ⚠ binding-state badge.

## Deliverables

1. **The detail/hint pane becomes a horizontal top bar.** `#detail`
   (`apps/annotate/index.html:50`, `an__detail`) currently sits as a vertical
   column eating roughly half the 3D canvas. Make it a single-line bar across
   the top of the canvas — and per Jeff's "could even be", make it a
   collapsible **commands/help element**: collapsed = the one-line current
   instruction; expanded = general help (what clicking, the rail, and the
   filters do — short lines, no paragraphs, per the UI-copy conventions).
   Design it as the future home of auto-suggestion settings (a staged
   follow-on handoff, `annotate_face_suggestions`, will add a section to it —
   leave the structure amenable, don't build its content).
2. **Entry context pre-selects everything derivable.** When the app boots from
   a node/edge deep link, apply the context automatically instead of just
   preloading dropdowns: topology and study selected, the element selected in
   the rail (not merely filtered), the element's part(s) isolated in the 3D
   canvas and the part list, and the top bar showing a task instruction
   composed from the element ("Select the face(s) that define <element name>"
   — plain words; singular/plural from what the binding needs). Implement as
   boot-time invocations of the existing command verbs, never ad-hoc state
   pokes.
3. **An "auto-filter" menu at the top of the left menu**: checkboxes to
   enable/disable each part of the automatic selection — auto-select topology,
   auto-select study, auto-filter part. Unchecking one returns that control to
   manual (the current behaviour) without disturbing the others; the setting
   should persist the way other viewer/annotate preferences do. Everyday
   words on the checkboxes, no algorithm names.
4. **Study/topology-scoped entry** (Jeff, same session: "when an entire study
   or topology is selected, there should be a way to enter the 3d view,
   pre-filtered to just the parts included in that study/topology (again
   transparent with the interface surfaces displayed in a different color).
   Definitely include an option to enable/disable transparency."). The
   per-study 3D launch exists (`study_3d_flyout`, 2026-09-10) — what's new is
   what a scope-level entry shows: only the parts that study/topology touches,
   bodies transparent, and the scope's **bound faces** (the interfaces its
   elements already have feature-identity bindings for) in a distinct colour.
   That colour role is display-of-known-bindings — derivable from the
   identity projection today, no geometry heuristics (those are the follow-on
   `annotate_face_suggestions` handoff, which reuses these display states).
   **Transparency is a user option, on/off**, living in the commands/help
   element (deliverable 1) or the auto-filter menu — agent's call which reads
   better — and it applies to element-scoped entry too, not just scope-level.

## Definition of done

- Entering the annotator via a real viewer edge deep link (the pitch-link
  topology in the live projection, main checkout `data/`) lands with
  topology + study + element selected, parts isolated, and the one-line
  instruction visible; unchecking an auto-filter box demonstrably returns
  that control to manual.
- Entering at study scope shows only that study's parts, transparent, with
  its already-bound faces coloured; the transparency toggle demonstrably
  flips both entry shapes.
- The 3D canvas is measurably wider than before (the pane no longer splits it
  vertically); the full-page and flyout embeddings both lay out correctly.
- JS suite + browser tier green in the main checkout; the deep-link contract
  tests still pin the URL format (extended only if a new param was truly
  needed).
- Lesson (`docs/sessions/lessons/LESSONS_20260921_annotate_hint_bar_and_context_autofilter.md`):
  which commands boot-context invokes and in what order, and what the
  suggestion handoff can rely on.
