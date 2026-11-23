---
type: feature
priority: low
status: open
area: spec_library
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261122_v2s_standard_parts_cite_their_spec_sheets.md
---

# The spec library cannot add a subject to an already-read document without restating the whole document

`build_library` raises on a `correction` that names a subject no earlier event for
the document established, and a `full` event replaces everything for its
document. Adding NAS6403U14D to `NAS6403-NAS6420 Rev 4.pdf` therefore took event
0007, a `full` restatement of all of event 0001 plus the new subject, with a test
pinning the carried entries equal to 0001's. Every later addition to a read
document (NAS6404U15D, a second MS14101 dash) repeats that: the log grows by a whole
document each time and the carried values move to the newest event id.

Options for strategy: a third event mode that adds subjects and may not touch an
existing one (smallest), or let `correction` introduce a subject. Recommendation:
the additive mode, with the same `supersedes`-free shape as `full` and a fold
rule that a subject already present is an error.

Related, same handoff: a straightness rule stated per inch of length (NAS6403
note (e), BB) has no home in an edge's `min`/`max`; any edge that wants it needs
the span's length, which belongs to the model, not the sheet.
