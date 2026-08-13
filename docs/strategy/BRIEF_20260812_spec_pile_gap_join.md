# STRATEGY BRIEF 2026-08-12 — spec_pile_gap_join: join the open-gap list against the spec pile

> **EXPANDED 2026-08-13 (strategy session) — consumed.** Answers: tool +
> backlog clearing = one handoff, two ordered phases; MS9363-09 fixed in
> phase 2; enforcement deferred (reporter only, allowlist seeded in the
> lesson); ratio restated once, last. Staged:
> `docs/sessions/HANDOFF_20260813_spec_pile_gap_join.md`.

**Routing note.** `docs/issues/ISSUE_20260810_nothing_sweeps_the_spec_pile_against_open_gaps.md`
is `type: feature`, `priority: med`, so per `TRIAGE_AGENT.md` it goes to strategy
rather than tactical. Triage has **not** designed this — a strategy agent should
decompose it into handoffs. What follows is the case, the evidence, and the
questions triage thinks decomposition has to answer.

## The problem in one sentence

A document arriving in `data/inbox/specs/` does not re-cite anything by itself,
and nothing in the repo notices that it *could*.

## The evidence

`NAS6403-NAS6420 Rev 4.pdf` has been in `data/inbox/specs/` since founding
(2026-08-03). It is **one document covering NAS6403 through NAS6420** — sheet 3's
grip/length table has a shared `Grip ±.010` column and one `LENGTH ±.015` column
per basic number, so it answers a grip question for any dash number of any bolt
in the family.

| what it could close | closed by | days it sat closable |
|---|---|---|
| `tan_link:fastener_grip_14` | `traced_labels_and_ratio`, 08-06 | 3 |
| `vpa_output:fastener_grip` (NAS6404 column) | same | 3 |
| `pitch_link:bolt_grip_11`, `bolt_length_11`, `cotter_hole_from_point` | `pitch_link_stack`, 08-04 | 1 |
| `tan_link:fastener_grip_13` | `fastener_citations_and_confidence`, 08-10 | 7 |
| `take2:fastener_grip_13` | same | 7 |
| `hardware_entries.json:NAS6403U13H` | same | 7 |
| `hardware_entries.json:NAS6403U14D` | same | 7 |
| `hardware_entries.json:NAS6404U13D` | same | 7 |

Ten citations, eight rows, three handoffs, seven days. **Nobody misread the
document; nobody re-opened it.** Each handoff re-cited exactly the elements its
own scope named and left the identical question unasked one row down the same
table. The issue was filed by the third handoff in a row to close gaps that had
been closable before it started — the two issues it merged both named the pattern
and neither filed it, because each read as a one-off.

**The sharper half is the false prose a stale gap leaves behind.** Three
`hardware_entries.json` gap entries read `NAS6403 standard, absent from this repo`
/ `NAS6404 standard absent` on 2026-08-10 — a claim about a file sitting in
`data/inbox/specs/`, in a repo whose worst-defect class is a provenance record
making a false claim. Only the three a scoped handoff happened to touch were
corrected.

**At least one more is live right now.** `hardware_entries.json:MS9363-09`'s gap
says *"What is still missing is entirely on the nut side: NUT HEIGHT, slot count,
and slot depth"*, written 2026-08-04. `MS9363 Rev C.pdf` landed 2026-08-05, was
read the same day into the spec library, and per `ARCHITECTURE.md` "Known
modelling gaps" **gives nut height, slot count and slot width**, plus
slot-to-slot and slot-axis control. The entry has been describing a closed
question for over a week. (That reading also established that the remaining phase
gap is uncontrolled by any standard — so the entry is not simply wrong, it is
stale in a way that *hides a more interesting finding*.) `JB_NAS77.pdf` and the
two RBC plain-bearing PDFs are named as candidates for `NAS77A4-015` and have
never been opened at all.

## Why it matters

The repo's headline number is the traced ratio, and it is **currently understated
by an unknown amount** — not because anything is mislabelled, but because nobody
asks the pile whether it already answers an open gap. The gap lists say what
document *would* close each gap; the pile says what documents are *here*. Those
two lists have never been joined.

The 2026-08-06 correction found the ratio understated 4x. That mechanism (wrong
labels) is now guarded by three tests. **This mechanism (documents that arrived
and were never revisited) is guarded by nothing**, and the table above shows it
firing four times in seven days.

## The shape the issue proposes

A sweep, run as a **debug tool and reported rather than enforced**, because it
produces candidates a human must confirm — the scans have no text layer, so the
last step is always a rendered crop read by vision.

1. **Collect the open questions.** Every element instance across `ALL_STACK_FILES`
   with `confidence` in (`untraced`, `inferred`), and every `hardware_entries.json`
   entry whose `values_source.confidence` is not `traced` — take the
   `hardware_ref` / `standard` / document named in the gap.
2. **Collect the pile.** `ls data/inbox/specs/` — main checkout, gitignored, so
   the tool must **skip rather than report empty** in a worktree, the same way
   `test_provenance.py`'s cross-repo check skips. Getting this wrong produces a
   tool that silently reports "no candidates" for every worktree agent.
3. **Join on the standard designator, not the filename.** This is the whole trick
   and the reason it is worth writing rather than eyeballing: `NAS6404U13D`'s gap
   said "NAS6404 absent" while the answering file is `NAS6403-NAS6420 Rev 4.pdf`.
   A substring match finds nothing; a **range** match — parse `NAS<lo>-NAS<hi>`
   and test membership — finds it. Same shape for `MS9363 Rev C.pdf` vs
   `MS9363-09` / `MS9363-10`.
4. **Report, do not relabel.** Print `element -> candidate file`, **and print the
   ones with no candidate**, because "still nothing here for NAS1149" is the other
   half of the answer and is what a spec-intake priority list is made of.
5. **Then decide whether it should fail.**

## The questions decomposition has to answer

- **Where does step 5 land?** A test that fires when a gap names a document now in
  the pile would be a real guard, but it needs the join to be trustworthy first
  **and** an allowlist for "present but does not actually give this quantity" —
  which is a real category, not hypothetical: NAS6403 is in the pile,
  `thread_transition`'s gap names it, and NAS6403 does **not** dimension the
  thread run-out (it gives `T (Ref)`, the whole thread region). A naive test would
  demand a re-citation that would be wrong. This caveat is why the issue files it
  as a tool first and a check second, and it is the main thing to get right.
- **Is the tool the deliverable, or is clearing the current backlog?** The tool
  finds candidates; someone still has to read crops and re-cite. Those are
  plausibly two handoffs, and the second one moves the traced ratio — which,
  per the 08-06 precedent (`traced_labels_and_ratio`), means anything restating
  the ratio must be sequenced behind it, not beside it.
- **Does `MS9363-09` get fixed now or wait for the tool?** It is a known-live
  false claim in a provenance record. It may deserve a small tactical handoff
  immediately rather than waiting on the join.

## Cost estimate (from the issue, worth sanity-checking)

Small. Steps 1–2 are ten lines over data the repo already parses; step 3 is the
only interesting part. Sized like `debug_report_tolerance_stacks.py --ratio`,
the closest existing analogue and the tool this repo gets the most value per
line from.

## Board context as of 2026-08-12

Four tactical handoffs staged in this repo alongside this brief:
`spec_library_projection_provenance`, `hardware_counts_doc_guard`,
`viewer_fixture_shape_guards`, and `viewer_export_and_material_provenance`
(which depends on the fixtures one). **None of them touch
`hardware_entries.json`'s gap prose or `ALL_STACK_FILES`**, so this work is
currently unblocked — but `hardware_counts_doc_guard` brings the values-source
counts under a doc-level test, so any handoff from this brief that re-sources an
entry will move numbers that test now guards. Sequence accordingly.
