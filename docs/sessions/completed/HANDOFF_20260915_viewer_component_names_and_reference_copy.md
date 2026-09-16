---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-15 — viewer_component_names_and_reference_copy: human names in the grid, plain words in the preview pane

Source: Jeff's 2026-09-15 review (forge note `20260915T145908_fwc7qp`),
verbatim complaints inlined below. Baseline: `master` @ `3141e51`. Scope:
this session owns the component/element labeling and the preview-pane +
hover-card copy in `apps/viewer/topology.js`, `apps/viewer/views/topology.js`,
`apps/viewer/views/detail.js`, `apps/viewer/views/cards.js`, plus the
preview-pane layout in `topology.html`/CSS, and their tests. Do NOT touch
`apps/annotate/`, the respine/tween code (`respine_tween_fidelity_round2`),
or the crop *images* themselves (owned by the follow-up
`viewer_reference_crops_in_context`).

## Jeff's items (all binding)

1. **The grid and preview pane print internal ids as names.** "2nd line
   bolt_nas6403u11d appears to be some type of internal id that is
   meaningless to user. Actually just realized this is what's used in the
   main table — replace these with a concise human friendly name
   (NAS6403U11D Shoulder Bolt is fine)." Today this is by design:
   `apps/viewer/topology.js:1205-1216` and `:1856-1862` print `part.id` with
   the prose `name` demoted to hover, a choice made when names ran to 80
   characters. The 2026-09-14 title pass (`164a07b`, short noun phrases with
   detail demoted to `description`) removed that reason. Flip it: grid
   merged cell and preview-pane title print `name`; the id appears nowhere a
   user reads (hover/debug only, if at all). If any `name` is still
   title-bloated, shorten it in the topology JSON per the title rule and
   note it in the lesson — related context (not this session's to decide
   beyond display): `docs/issues/ISSUE_20260914_element_and_edge_names_are_not_under_the_title_rule.md`.
2. **Repeated text in "component" and "element" columns.** "The element
   column can just say 'grip length' (for the bolt) or 'length' for the
   plain bushing. The component's description and part number don't need to
   be repeated in every column." One fact appears once per row group.
3. **Cryptic provenance prose goes.** Kill from all rendered surfaces
   (preview pane, hover cards, detail view):
   - "no drawing recorded for this part" on a COTS fastener — wrong and
     meaningless; say what's true: it's a standard part whose dimensions
     come from the NAS sheet, e.g. "standard part — dimensions from
     NAS6403-NAS6420 Rev 4, sheet 3".
   - "Balloon 5X in DETAIL B per the referenced element's source_ref" /
     "see the referenced element's own gap note" — internal field names and
     dead-end references; either render the actual reference (drawing +
     sheet + a link) or say nothing.
   - "read from the export this citation names, … — sha256 VERIFIED ·
     showing the declared region "Grip Dash No. 11 row", matched on …" —
     this restates the concise line above it in jargon. The concise
     reference ("NAS6403-NAS6420 Rev 4.pdf · sheet 3") is the rendering;
     sha/match provenance moves behind a small disclosure or goes entirely.
   - Full workstation file paths (`C:/workspace/tolstack/data/...`) — never
     rendered when the link works.
   These are instances of the standing UI-copy rules (no internal
   file/module/field names, no jargon, no paths); apply them to every string
   this session touches, and add the rules to
   `docs/prompts/REVIEW_AGENT.md`'s checklist if not already there so the
   next viewer session inherits them.
4. **The "open the PDF" link is broken** — "nothing happens when clicked."
   Diagnose on both transports (FSA and the drawing-checker-served origin —
   likely related to
   `docs/issues/ISSUE_20260909_served_via_drawing_checker_cannot_reach_worksheets.md`
   and the capability-gap posture: a link the current origin cannot service
   must not render as a dead control — fix it or hide it per transport
   capability).
5. **The right preview pane is resizable.** "It's too narrow." Drag divider,
   width persisted (localStorage is fine), sane min/max.

## Definition of done

- On the live pitch-link topology: the grid's component column reads like
  Jeff's example (short human names, no `bolt_nas6403u11d` anywhere a user
  looks); the bolt's preview shows the concise NAS reference with a working
  link and none of the quoted jargon strings; element cells carry only the
  feature name; the pane resizes and remembers its width.
- Value-level tests pin the rendered label for at least the four pitch-link
  parts and assert the banned strings (internal ids, "source_ref",
  "sha256", absolute paths) appear in no rendered output.
- Full suite green; lesson records copy decisions + the link-failure root
  cause per transport.
