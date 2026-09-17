---
type: feature
priority: med
status: open
area: schema/citations
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260916_citation_identity_correctness.md
---

# An element whose nominal and band come from two different artifacts can cite only one of them, and the other reading survives only as prose

`source_ref` is singular. An element that reads its **nominal** off one
artifact and its **band** off another has to pick, and whichever it does not
pick stops being a citation and becomes a sentence in a `note` — invisible to
every consumer that reads the field.

## The concrete instance, twice now

`docs/tolerance_stacks/stack_rotor_fastener_length.json::washer_nas1149v0332_tt`,
2026-09-16 (`citation_identity_correctness`). Before: `kind: "parts_list"`,
217755 A.1 sheet 8 zone K4 SECTION T-T, find 32, `inferred`, zero-width band.
After: `kind: "workbook"`, 260729 `grip length tols old` E11/F11, `untraced`,
band 0.7112/0.9144.

Both readings are real and neither is wrong:

- the **parts-list row** is where the 0.032 in nominal comes from, it is
  ballooned on the sheet, and its export is sha256-established;
- the **workbook cell** is where the ±0.004 in comes from, and a parts-list row
  carries a nominal and **never** a band (repo `CLAUDE.md`), so it cannot be
  the citation for a banded element.

The band citation had to win. What that cost, measured on the same day:

1. **The viewer crop is gone.** `kind: "workbook"` is in
   `build_viewer_crops.py::NO_DOCUMENT_KINDS`, so
   `crops/rotor_fastener_length__washer_nas1149v0332_tt.png` is no longer
   emitted. It was one of only four live balloon crops in the repo, and the one
   this same session hardened `parts_list_row_for` to frame correctly — a
   verified balloon, on a sha256-established export, with a real find number.
   A reader of this element now has no picture at all.
2. **The find number leaves the machine-readable surface.** `find 32` — the
   answer to "which of the two `NAS1149V0332H` rows" that this session's whole
   deliverable 1 is about — now exists for this element only inside a `note`
   string.

`pitch_link_to_pitch_plate::washer_nas1149v0332` made the identical trade on
2026-09-15 (`pitch_link_known_bands`), so this is a pattern, not an incident,
and it will recur every time the 2026-09-15 placeholder ruling is applied to an
element whose nominal came off a parts list.

## Why this is a design question and not a fix

The obvious shapes all have real costs and the choice is not a tactical one:

- **`source_refs: [...]`** — plural. Honest, and breaks every consumer that
  reads `element.source_ref`, plus the schema version.
- **A `corroborated_by` list beside `source_ref`** — additive and optional, the
  shape `export` took in 2026-08-06. Keeps one primary citation while letting
  the crop builder and the viewer reach a second artifact. Needs a rule for
  which one is primary, and the answer is probably "the one the *band* came
  from", because confidence grades the band.
- **Per-field citation** (`nominal.source_ref`, `band.source_ref`) — the most
  accurate and by far the largest change.
- **Do nothing**, and accept that applying a workbook band to a parts-list-
  nominal element silently costs the element its picture. That is a legitimate
  answer, but it should be a decision with its reasoning written down rather
  than a side effect nobody chose.

Whichever way it goes, the rule "a value's citation must name the thing it
actually came from" is what makes this a question worth answering rather than a
convenience.

## Related

- `docs/strategy/BRIEF_20260916_link_name_authority.md` — the neighbouring
  question of an id and a name disagreeing after a re-cite.
- `ISSUE_20260915_the_joint_assembly_export_is_prose_so_its_runs_have_no_ts.md`
  — the same failure mode one level up: a real citation demoted to prose loses
  the fields that made it checkable.
