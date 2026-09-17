---
type: chore
priority: low
status: open
area: docs/topologies
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_viewer_hover_deslop_and_banner_purge.md
---

# Five authored notes open with "Added 2026-09-15 (handoff …)", so the one sentence the viewer shows in the open is bookkeeping

Jeff, 2026-09-16: *"User doesn't care when or which tactical handoff a reference
was added."* `viewer_hover_deslop_and_banner_purge` answered that by PLACEMENT —
a hover card shows a note's **lead sentence** in the open and the whole note
inside its `Data source` fold — and the handoff was explicit that the records
themselves must not be edited there (`VERBATIM_PROSE_CLASSES` protects them, and
rewriting a document's own prose from the viewer's side is the thing this repo
exists not to do).

That leaves five live notes where the lead sentence *is* the bookkeeping, so the
placement fix cannot help them: the always-visible line names a handoff and a
date, and the physical fact is the sentence after it, inside the fold.

| document | key | the sentence the card shows in the open |
|---|---|---|
| `pitch_link_to_pitch_plate` | part `spherical_bearing_pitch_link` | "Added 2026-09-15 (handoff stack_fable_audit) with the stack's own pitch_link_eye element; the name restyled to the reader-facing convention during review (the 2026-09-15 copy pass landed in parallel)." |
| `pitch_link_to_pitch_plate` | part `flanged_bushing_nas77a3_015a` | "Added 2026-09-15 (handoff stack_fable_audit); the name restyled to the reader-facing convention during review." |
| `pitch_link_to_pitch_plate` | node `bushing_eye_face` | "Replaced \`bushing_pitch_plate_face\` on 2026-09-15 (handoff stack_fable_audit): …" — and it prints an internal node id in backticks besides |
| `pitch_link_to_pitch_plate` | node `eye_flange_face` | "Added 2026-09-15 (stack_fable_audit); mirrors the tan-link take-2 topology's bearing_flanged_bushing_face." |
| `pitch_link_to_pitch_plate` | node `flange_lug_face` | "Added 2026-09-15 (stack_fable_audit). The flange bears on the lug face; the bushing's barrel passes into the lug's bore (not modelled — no bore-depth path in the referenced stack)." |

The last one is the clearest case for what a fix looks like: the useful sentence
already exists, it is simply second. **Reordering, not deleting** — when and
which handoff a thing was added is real provenance and belongs in the note; it
just does not belong in the first sentence, which is the one a reader is shown
without asking.

**Not fixed here** because `docs/topologies/*.json`'s authored values were on
this handoff's do-not-touch list, and because reordering a record's own prose is
an authoring decision with a ground-truth test standing behind every value in
the file — it wants the session that owns those documents, not a viewer pass.

A second, larger question sits behind it and is worth asking once rather than
five times: should a topology document carry a short `description` field
distinct from `note`, so the viewer has something to show in the open that was
*written* to be shown in the open? Today `note` is doing both jobs and
`VA.leadSentence` is guessing where one ends.
