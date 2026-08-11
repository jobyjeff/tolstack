---
type: bug
priority: med
status: closed
handoff: docs/sessions/HANDOFF_20260810_sop_library_ref_pairing.md
area: docs/SOP_TOLERANCE_STACK.md / vocabulary drift
reporter: agent
closed: 2026-08-11
closed_by: handoff sop_library_ref_pairing
---

> **CLOSED 2026-08-11** by handoff `sop_library_ref_pairing`. All five sites now
> state the pairing (a filled `library_ref` ⟺ `values_status == "library"`), the
> Step 4 rule bullet was replaced rather than edited and quotes its old wording in
> a dated blockquote, and Step 4 now carries **two** examples so both the
> with-a-library-subject and without cases can be copied — the promoted one keeps
> its `values_source` and its inline dimensions. Three further homes were found and
> fixed (`docs/tolerance_stacks/README.md` ×4, the root `README.md` schema table,
> and a stale count in `test_tolerance_stack.py`'s docstring);
> `docs/prompts/REVIEW_AGENT.md` already stated the pairing, and the
> `materials.json` / `thermal.py` nullness claims are still **true** and were left
> alone. The `sop_edits_apply` guard narrowing this issue said lived only in the
> review report is now in the SOP's `values_source` bullet.
>
> Mechanised in `tests/test_sop_vocabulary.py` (3 tests): Step 4's examples are
> parsed and run through the same invariant function as the real entries, and a
> scan fails any live doc that still asserts the superseded nullness rule —
> replayed against the drifted blob at `abfaf5a` so it is red on the real sighting.
> See `docs/sessions/lessons/LESSONS_20260811_sop_library_ref_pairing.md` for what
> that scan can and cannot catch, and for the definition-of-done proposal.

# The SOP still says `library_ref` stays null, in five places, and it has not since 2026-08-05

Found during `review/citation_export_provenance` (2026-08-06) while checking the
SOP diff. Out of scope for that handoff — filed, not fixed.

`spec_library_v0` (2026-08-05) promoted `NAS6403U11D` in
`docs/tolerance_stacks/hardware_entries.json` to:

```json
"values_status": "library",
"library_ref": "spec_library:NAS6403U11D"
```

and the enforcing test was generalised in the same handoff: the invariant is now
the **pairing** (a filled ref ⟺ `values_status == "library"`), not nullness. The
review overlay already records this. The SOP did not follow:

| line | text |
|---|---|
| 66 | schema table: "…an empty `library_ref`…" |
| 409 | the `hardware_entry` example: `"library_ref": null` |
| 442–445 | "**`library_ref` stays `null` until a fastener library exists.** … a test asserts it is null" |
| 691 | Step 7's structural invariants: "every hardware entry has a null `library_ref`" |
| 743 | the closing checklist, item 5: "`library_ref` stays null" |

The library exists (`tolerance_stack/spec_library.py`), so line 442's precondition
has been met and its instruction inverted. An author following the SOP for a new
stack would either write a null ref for a part that has a library entry, or
"correct" the promoted entry back to null and break the pairing test.

This is the repo's own **documented-vocabularies-drifting-from-the-seeded-data**
class, third sighting (after `role`/`nut_geometry` and `kind: "spec"`), and again
it spans the three homes a vocabulary lives in: the SOP prose is stale while the
dataclass and the test have moved on.

## Fix

Rewrite the five sites to state the pairing invariant, and update the example
entry to show a filled `library_ref` alongside `values_status: "library"` and a
retained `values_source` (the inline numbers survive as a cross-check — that is
the part most likely to be got wrong from the current prose). Whoever does it
should re-read `docs/sessions/reviews/REVIEW_20260805_spec_library_v0.md` first,
since the narrowing of the colliding `sop_edits_apply` guard is recorded there
and not in the SOP.
