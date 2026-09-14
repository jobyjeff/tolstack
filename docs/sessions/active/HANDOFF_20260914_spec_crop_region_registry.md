---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-14 — spec_crop_region_registry: declared crop regions for spec-pile citations, so a fastener card shows the row, not the whole sheet

Source: Jeff, 2026-09-14 strategy session (decision: Option B, region
REGISTRY — promoted from dispatch
`docs/strategy/drafts/DRAFT_datasheet_reference_crops.md`, now deleted).
The problem: for a spec-pile citation the crop IS the whole sheet
(`scripts/build_viewer_crops.py`'s `spec_pile` rule — filename is the
identity, no zone to pin), so a fastener datasheet card shows a page with
a dozen-column table instead of the cited row. Jeff: "Currently datasheet
cross refs (for fasteners) just display the entire spec sheet which often
has large tables with dozens of rows." Baseline: `integration`. Scope: a
new tracked registry file under `docs/spec_library/` (or a sibling —
agent's call, stated in the lesson), a small CLI/script to add entries
(everything-CLI rule: rerunnable, never hand-edited JSON),
`scripts/build_viewer_crops.py` consumption, SOP note, tests. Do NOT
touch `source_ref` schema (the registry decision exists precisely to
avoid that ripple); do NOT touch viewer layout code (owned by the
active/staged viewer handoffs) — the card already renders whatever crop
resolves, and that stays true.

## Deliverables

1. **The registry.** Per-document declared regions:
   `{document filename (spec-pile identity), page, rect, label}` — e.g.
   the NAS6403 table's dash-row band with label "NAS6403U11D row". Tracked
   config with a schema line, append-friendly, evidence-bearing (the
   entry's label + a note of what the region shows is the evidence — the
   alias-table precedent: declared configuration, never fuzzy matching).
   One document may carry many regions; a region may be cited by many
   stacks — that reuse is why Jeff picked the registry over
   per-citation rects.
2. **A recording verb.** A CLI/script that appends a region entry
   (validates the document exists in `data/inbox/specs/`, the page
   exists, the rect is on-page) — the tool agents use at citation time
   going forward. The pile stays append-only and untouched.
3. **Crop-script consumption.** `build_viewer_crops.py`: for a spec-pile
   citation, if the registry has a region matching the cited document
   (and, where the citation's where-ref names something matchable, the
   right region — suggestion: match on label/where-ref text, fall back
   to the document's sole region when it has exactly one, whole-sheet
   otherwise), crop that region; the crop entry records which registry
   entry resolved it (a new `resolved_by` value — remember the viewer's
   `VA.CROP_RULES` is total-by-contract and needs the new row, plus
   `fixtures.js` key-union updates). A citation with no matching region
   keeps the whole-sheet crop exactly as today — nothing is invented.
4. **SOP note.** One short rule in the spec-library README/SOP: when you
   read a value off a pile document, record (or reuse) the region. Point
   at the verb; don't restate the schema.

## Definition of done

- The live fastener citations (the 4 `spec_pile`-resolved crops in
  `crops.json`) demonstrate the flow: at least one gains a registry
  region and its rebuilt crop shows the row band, not the page; the
  card renders it with the whole sheet still one click away (the
  existing source-PDF link — no new UI needed).
- Full pytest + viewer fast tier green (crop-rule totality and fixture
  guards updated); rebuilds run from the main checkout.
- Lesson: the registry path/shape chosen, the region-to-citation match
  rule actually implemented, and whether the where-ref text proved
  matchable or the sole-region fallback carried it.
