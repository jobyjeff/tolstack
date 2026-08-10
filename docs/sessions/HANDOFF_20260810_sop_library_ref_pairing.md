---
priority: medium
depends_on: []
---

# HANDOFF 2026-08-10 — sop_library_ref_pairing: the SOP still says `library_ref` stays null, in five places, and it has not since 2026-08-05

Source: `docs/issues/ISSUE_20260806_sop_still_says_library_ref_stays_null.md`
(`bug`/med, filed during `review/citation_export_provenance`). Triaged 2026-08-10.
Baseline: `master`; `spec_library_v0` and `citation_export_provenance` are merged and
completed. Scope: `docs/SOP_TOLERANCE_STACK.md` — the five `library_ref` sites listed
below. Do **NOT** edit that file's § "The traced ratio" (the staged
`fastener_citations_and_confidence` recomputes it) and do not relabel any stack
element.

## The drift

`spec_library_v0` (2026-08-05) promoted `NAS6403U11D` in
`docs/tolerance_stacks/hardware_entries.json` to:

```json
"values_status": "library",
"library_ref": "spec_library:NAS6403U11D"
```

and generalised the enforcing test in the same handoff: **the invariant is now the
pairing** (a filled ref ⟺ `values_status == "library"`), **not nullness**. The review
overlay already records this. The SOP did not follow:

| line | text |
|---|---|
| 66 | schema table: "…an empty `library_ref`…" |
| 409 | the `hardware_entry` example: `"library_ref": null` |
| 442–445 | "**`library_ref` stays `null` until a fastener library exists.** … a test asserts it is null" |
| 691 | Step 7's structural invariants: "every hardware entry has a null `library_ref`" |
| 743 | the closing checklist, item 5: "`library_ref` stays null" |

The library exists (`tolerance_stack/spec_library.py`), so **line 442's precondition
has been met and its instruction inverted.** An author following the SOP for a new
stack would either write a null ref for a part that has a library entry, or "correct"
the promoted entry back to null and break the pairing test.

This is the repo's own **documented-vocabularies-drifting-from-the-seeded-data**
class, **third sighting** (after `role`/`nut_geometry` and `kind: "spec"`), and again
it spans the three homes a vocabulary lives in: the SOP prose is stale while the
dataclass and the test have moved on.

## Deliverables

1. **Rewrite the five sites to state the pairing invariant.** Not "may be filled" —
   state the biconditional, in the words the test enforces, so a reader cannot come
   away thinking either half is optional. Line 442 is the one that most needs
   replacing rather than editing: its whole structure is "not yet, until X", and X has
   happened.

2. **Update the line-409 example entry** to show a filled `library_ref` alongside
   `values_status: "library"` **and a retained `values_source`.** The issue flags this
   as "the part most likely to be got wrong from the current prose": the inline numbers
   survive promotion as a cross-check, and an example that drops them would teach the
   opposite. Use the real `NAS6403U11D` entry as the model so the example and the data
   agree.

3. **Read `docs/sessions/reviews/REVIEW_20260805_spec_library_v0.md` first.** The
   narrowing of the colliding `sop_edits_apply` guard is recorded **there and not in the
   SOP** — so the SOP is missing context that constrains how these sections may be
   edited. If that narrowing should be in the SOP too, put it there and say so; a fact
   that only lives in a review report is the same failure one level up.

4. **Check the fourth home before you finish.** The issue names three homes (prose,
   dataclass, test) and this is the third sighting of drift between them. Grep for
   `library_ref` across `docs/`, the worksheets, `ARCHITECTURE.md` and test comments and
   report every occurrence with whether it states nullness or pairing. Sighting 3 of the
   *other* recurring class in this repo was exactly a claim that had "escaped into a
   stack note, a worksheet headline and two test comments" — assume this one has too
   until you have looked.

5. **Consider whether this class is mechanisable.** Three sightings of "the SOP
   describes a vocabulary the code no longer implements" is the trigger this repo uses
   to stop amending. A test that extracts the vocabulary the SOP *documents* (the schema
   table at line 66, the example at 409) and asserts it against the dataclass fields and
   the seeded data is plausible and would have caught all three sightings. Prototype far
   enough to report feasibility; **do not half-land it.** If it is not feasible, say
   what makes it not feasible — that answer is worth as much as the test.

## Coordination

`HANDOFF_20260810_fastener_citations_and_confidence` (staged) edits the **same file**
at § "The traced ratio" and updates `hardware_entries.json`'s prose counts. No
`depends_on` in either direction — the sections do not overlap and chaining a prose fix
behind a re-citation exercise would delay both. Whichever lands second rebases across
the other: confirm the sections you did not touch are intact, and resist tidying the
other handoff's prose.

## Definition of done

- All five sites state the pairing invariant; the line-409 example shows a filled
  `library_ref`, `values_status: "library"` and a retained `values_source`, and matches
  the real `NAS6403U11D` entry.
- The deliverable-4 grep is reported in full, with any additional drift sites fixed in
  the same commit.
- An author could follow the SOP to author a new hardware entry for a part **with** a
  library entry and one **without**, and get both right. Walk through both cases in the
  lesson — that is the real acceptance test for a doc fix, and it is cheap.
- Full suite green, including the pairing test and the doc-level tests. `venv-win` is
  gitignored and absent from a worktree — run
  `& C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q` against your
  worktree's code.
- `PROVENANCE.md` amended if any file you touch claims byte-identity.
- Lesson (`docs/sessions/lessons/LESSONS_20260810_sop_library_ref_pairing.md`): the
  deliverable-5 feasibility answer, and — the durable part — whether **"the SOP is
  updated in the same handoff that changes the invariant"** should become a definition-of-done
  line for every handoff in this repo. Three sightings say the drift is systematic, and a
  test that catches it after the fact is strictly worse than a handoff template that
  prevents it.
