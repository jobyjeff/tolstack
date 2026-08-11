# LESSONS — sop_library_ref_pairing (2026-08-11)

Handoff: `HANDOFF_20260810_sop_library_ref_pairing`. Source issue:
`ISSUE_20260806_sop_still_says_library_ref_stays_null` (now closed). Baseline
`master` at `abfaf5a`; suite **340 passed / 1 skipped** before, **343 / 1** after.

The five SOP sites are rewritten, both authoring cases are now worked examples,
and the class is mechanised as far as it usefully goes — with one honest hole,
which is the most useful thing in this file.

---

## 1. The acceptance test the handoff asked for: walk both cases

**Case A — a part the library does NOT hold** (still the ordinary case). Read
Step 4. The first example is `NAS1149V0332`: `values_status: "inline"`,
`library_ref: null`, a mandatory `values_source` naming the workbook cell, a
non-empty `gaps`. The rule bullet's second sub-bullet says exactly this and adds
the one thing an author gets wrong here — *do not invent a ref for a subject the
library does not hold*, because that is not a null-vs-filled question, it is a
citation to a document nobody read. **Correct entry produced.**

**Case B — a part the library DOES hold.** Step 4's second example is the
abridged real `NAS6403U11D`: `values_status: "library"`,
`library_ref: "spec_library:NAS6403U11D"`, `values_source` **still there**, and
`dimensions_in` **still there**. The prose above it says the two fields are one
decision and that the ref must *resolve* (rebuild with
`python -m tolerance_stack` and look). The `values_source` bullet says in so many
words that `not_transcribed` is the only status that nulls it. **Correct entry
produced**, including the two fields the old prose would have led an author to
delete.

Before this handoff, case A was producible and case B was not: the old bullet said
to write a null ref and that "a test asserts it is null", so an author with a
library-backed part either nulled a filled ref or "corrected" `NAS6403U11D` back
and broke `test_every_hardware_entry_has_a_gap_list_and_a_resolvable_values_status`.
Walking the two cases is a cheap acceptance test and it found the real gap — the
example, not the prose, is what gets copied.

## 2. Deliverable 4 — every `library_ref` occurrence, classified

Grepped `library_ref` across the whole repo, not just the four places the handoff
named. `docs/sessions/**` (handoffs, reviews, lessons) and `docs/issues/**` are the
historical record and out of scope by the same rule the traced-ratio and provenance
doc tests use: they are what someone believed on a date.

| file:line | states | verdict |
|---|---|---|
| `docs/SOP_TOLERANCE_STACK.md:133` (schema table) | nullness ("an empty `library_ref`") | **FIXED** → pairing |
| `docs/SOP_TOLERANCE_STACK.md:519` (Step 4 example 1) | `null` on an `inline` entry | **correct data**, kept, and now labelled as the no-library-subject case |
| `docs/SOP_TOLERANCE_STACK.md:546` (Step 4 example 2) | filled + `library` | **NEW** — the case that did not exist |
| `docs/SOP_TOLERANCE_STACK.md:594–615` (the rule bullet) | nullness, with an "until X" precondition that had been met | **REPLACED**; old wording quoted in a dated blockquote |
| `docs/SOP_TOLERANCE_STACK.md:575` (`values_source` bullet) | neither — cites `library_ref`'s explicit-null *convention* | correct; extended with the `not_transcribed`-only rule (deliverable 3) |
| `docs/SOP_TOLERANCE_STACK.md:882` (Step 7 invariants) | nullness | **FIXED** → pairing |
| `docs/SOP_TOLERANCE_STACK.md:965` (quick reference item 5) | nullness | **FIXED** → pairing |
| `docs/tolerance_stacks/README.md:20–25` | "the fastener library is still a separate open question" | **FIXED** — it exists; names the promoted entry |
| `docs/tolerance_stacks/README.md:63` (Contents table) | nullness ("an empty `library_ref` slot") | **FIXED** → filled where the library holds the part |
| `docs/tolerance_stacks/README.md:117–122` (hardware entry shape) | nullness + "when the fastener library exists" | **FIXED** → pairing |
| `docs/tolerance_stacks/README.md:94–100` (material entry shape) | nullness, of `material_entry` | **TRUE** — no materials library. Kept, and now says *why* it differs from `hardware_entry`, so the next reader does not "fix" it |
| `README.md:102` (root schema table) | "pointing at a spec-library subject **once one exists**" | **FIXED** → `iff` |
| `ARCHITECTURE.md:203` (data-flow diagram) | neither — the arrow from the projection to the stacks | correct |
| `docs/prompts/REVIEW_AGENT.md:339–342` | **pairing**, plus the `values_source` retention | already correct — the review overlay led the SOP by six days |
| `docs/prompts/REVIEW_AGENT.md:321` | nullness, of `material_entry` | **TRUE** |
| `tolerance_stack/thermal.py:106,128,160` (`MaterialEntry`) | nullness, of `material_entry` | **TRUE** — the only dataclass with a `library_ref` field at all |
| `tests/test_tolerance_stack.py:1194` (comment) | narrates the promotion | correct |
| `tests/test_tolerance_stack.py` (the pairing test) | pairing | correct; docstring's "the remaining twelve are still `inline`" was **stale** (13-entry file) → **FIXED** |
| `tests/test_hub_bearing_thermal_fit.py:140–147` | nullness, of `material_entry` | **TRUE** and enforced |
| `tests/test_spec_library.py:542–584`, `tests/test_spec_library_review.py:434` | pairing / the promotion | correct |
| `docs/tolerance_stacks/hardware_entries.json` (`description`, `library_ref_note`, 15 entries) | pairing; 14 null + 1 filled | correct — the *data*'s own prose was never stale on this |
| `docs/tolerance_stacks/materials.json` (3 entries) | `null` | correct data |
| `docs/reference/LESSONS_20260729_tolerance_stack_slice1.md:102–104,207` | nullness | **historical and frozen.** `docs/reference/` is insert-only and `test_provenance.py` fails on any non-insertion; it accurately describes 2026-07-29, when there was no library. Left alone deliberately |
| `PROVENANCE.md:74,77,96` | narrates the promotion / this handoff | correct |

**Two things this table is worth reading for.** First, the handoff's suspicion was
right: the claim had escaped the SOP into three other live files. Second, the split
that makes the mechanised check hard — **the identical sentence is false about
`hardware_entry` and true about `material_entry`.** Any grep-shaped guard that does
not know which schema is under discussion produces four false positives
immediately (measured, not guessed: `PROVENANCE.md`'s test-file row, the SOP's
quick-reference item 4, `REVIEW_AGENT.md`'s materials bullet, and its own denial of
the old rule).

**One stale count found and deliberately NOT fixed:**
`docs/tolerance_stacks/README.md:128` and `docs/prompts/REVIEW_AGENT.md:348` both
still say eight hardware entries transcribe the workbook; it has been five since
2026-08-10. That is `fastener_citations_and_confidence`'s number, and this
handoff's coordination section says not to tidy its prose — filed as
`ISSUE_20260811_the_values_source_counts_in_two_live_docs_are_stale.md`. Worth a
look by whoever picks it up: the README paragraph carrying the stale count *ends
with a warning not to quote counts from there because a test asserts them* — and
the test it points at guards a different file's copy of the number.

## 3. Deliverable 5 — is this class mechanisable? Partly, and the part that is not is the answer

Landed in `tests/test_sop_vocabulary.py` (3 tests, all green, none vacuous):

1. **`test_the_sop_step_4_examples_obey_the_invariants_they_teach`** — parses the
   ```json blocks out of the SOP's Step 4, runs them through
   `hardware_entry_problems()` (the *same* function
   `test_every_hardware_entry_has_a_gap_list_and_a_resolvable_values_status` now
   uses over the seeded file), then compares every rule-bearing field against the
   real entry each example abridges. An example is a fixture; this treats it as
   one. Anti-vacuity: it asserts Step 4 shows **both** halves of the pairing and
   that the promoted example keeps `values_source` *and* `dimensions_in`.
2. **`test_no_live_doc_still_asserts_the_superseded_nullness_rule`** — a scan of
   every tracked `.md`/`.py`/`.json` outside the historical record for prose
   asserting the old rule, matched **near the `library_ref` token** (because of the
   `material_entry` split above), with a negation guard and the repo's existing
   blockquote escape.
3. **`test_the_scan_catches_the_reconstructed_sighting_three`** — replays the scan
   against the real drifted blob at `abfaf5a`, so the check is demonstrably red on
   the sighting it was written for rather than on a mock. Same pattern as
   `test_provenance.py`'s sighting replays.

**The feasibility answer the handoff asked for, precisely: the test it proposed
would NOT have caught this sighting.** The handoff suggested extracting the
vocabulary the SOP documents (the schema table, the example) and asserting it
against the dataclass fields and the seeded data. Run that thought experiment
against all three sightings:

| sighting | shape | would a vocabulary-vs-data test catch it? |
|---|---|---|
| 1. `role` / `nut_geometry` | the SOP's enumerated list was missing a value the data used | **yes** — set difference |
| 2. `kind: "spec"` | same shape, whitelist vs prose | **yes** |
| 3. `library_ref` | the SOP named every value the data used, and its example was internally valid | **no** |

Sighting 3 is not a vocabulary mismatch. `library`, `inline`, `not_transcribed`
were all documented; the example (`inline` + null ref) *satisfies* the pairing
invariant; the schema table's field list was complete. What was wrong was a
**sentence about a rule** — "stays null until X", plus a claim about a test that no
longer existed in that form. There is no data-shaped signal to compare against,
which is why nothing caught it for six days across three reviews.

Two further obstacles worth recording, because they are what a future attempt will
hit:

- **There is no `HardwareEntry` dataclass.** `hardware_entry/v0` is read as raw
  dicts by the tests; the only `library_ref` field in the package belongs to
  `MaterialEntry` (`thermal.py`), which is the shape where nullness is still
  correct. So "assert the SOP against the dataclass fields" has no dataclass on
  the side that drifted. The invariant lives in a test, and the mechanisation had
  to hoist it into a function to be shared.
- **The same sentence is true of one schema and false of another.** Proximity to
  the field name is the only cheap discriminator, and it is a heuristic. It works
  today (four real false positives suppressed, zero remaining) and it will need a
  phrase added the first time someone invents a new way to write the old rule.

So: **the example check is real mechanisation; the prose check is a tripwire, not a
parser.** It catches a revert and it catches the specific phrasings that have
already gone wrong. It cannot catch a *new* wrong sentence, and pretending
otherwise would be the vacuous-check failure this repo has already named twice.

## 4. The durable part — should the SOP update become a definition-of-done line?

**Yes, and it is the highest-value line available**, for a reason this session
demonstrated from the inside: a test that catches the drift after the fact is
strictly worse than a handoff template that prevents it.

Recommended wording, for the DoD block of every handoff in this repo:

> - **If this handoff changes an invariant, a vocabulary or a schema field, the SOP
>   / `README` / `REVIEW_AGENT` sentence that states it is updated in the same
>   commit — or the handoff says explicitly which other handoff owns that prose.**

The evidence for it, from this repo's own history:

- `spec_library_v0` changed the invariant and generalised the test **in the same
  handoff**. It did not touch the SOP, and it was right not to: its lesson
  deliberately routed the SOP amendment to `sop_edits_apply` rather than reaching
  outside scope. That routing then failed silently — nobody picked it up, and the
  issue was filed by a *different* review a day later.
- The review overlay (`REVIEW_AGENT.md:339`) got the pairing right on 2026-08-05.
  So the correct sentence existed in the repo, six days before the SOP got it. The
  failure was never ignorance; it was that no artifact required the two to agree.
- **Three sightings, three homes each time** (prose, dataclass/schema, test). The
  code half moves in the handoff that changes it. The prose half moves only if
  something makes it move.

The escape hatch in the wording matters — this handoff and
`fastener_citations_and_confidence` deliberately split one file between them, and a
DoD line with no "or say who owns it" clause would have forced a spurious edit or a
spurious `depends_on`. Naming the owner is the cheap thing that would have caught
`spec_library_v0`: its lesson named `sop_edits_apply` as the owner, but no
definition-of-done anywhere required that pointer to be *discharged*.

## 5. Decisions made here that were not in the handoff

- **Two examples in Step 4, not one rewritten.** The handoff says to update the
  example to show a filled ref; the definition of done also says an author must be
  able to get **both** cases right. Replacing the only example would have taught
  the promoted case (1 of 15 entries) as the default and deleted the ordinary one.
  So `NAS1149V0332` stays as case A and an abridged `NAS6403U11D` is added as case
  B, and the new test asserts both are present by id — the pairing cannot be
  half-documented again without failing the suite.
- **The replaced bullet's old wording is quoted in a blockquote**, following the
  traced-ratio rule ("correct it in place, leave the old one visible"). This is not
  decoration: the new scan reads an *asserted* form of the old wording as the drift
  returning, so a correction note has to be quoted to be legible to it. The
  blockquote escape is per-*line*, not per-paragraph, because a dated correction
  sits inside the very bullet that replaced it with no blank line between.
- **Counts kept out of the new prose.** Every temptation to write "14 of 15 entries
  are null" was replaced with a pointer to the test that owns the number
  (`test_only_the_one_entry_was_promoted`). This repo's stale-count bug has bitten
  the same paragraph twice; a doc fix that introduces a fresh count would be the
  next sighting.
- **`docs/reference/` left untouched** even though it states the old rule — it is
  insert-only imported material and `test_provenance.py` fails on any non-insertion.
  A dated blockquote insertion would be permitted, but the text is an accurate
  record of 2026-07-29 and is not instructions to anyone.
- **The board was not moved.** This branch is off `abfaf5a`, where the handoff still
  sits at `docs/sessions/`; `master` moved it to `active/` in `7d3abef`. Moving it
  here would fight that. The `active -> completed` move is the reviewer's/
  orchestrator's commit, per the last four handoffs.

## 6. For whoever lands second

`fastener_citations_and_confidence` merged before this branch started, so there was
nothing to rebase across: its § "The traced ratio" and its `hardware_entries.json`
prose counts are untouched here, and `test_every_document_quoting_the_traced_ratio_
quotes_the_current_number` is green, which is the mechanical confirmation that the
sections this handoff did not own are intact. No stack JSON, no worksheet, no
element and no number changed on this branch.
