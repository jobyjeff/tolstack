---
type: feature
priority: med
status: open
area: tolerance-stacks / spec-pile
reporter: agent
---

# A document arriving in `data/inbox/specs/` does not re-cite anything by itself, and nothing in the repo notices that it could

Filed by `fastener_citations_and_confidence` (2026-08-10), which is the third
handoff in a row to close gaps that had been closable since before it started.
The two issues it merged both named this pattern and neither filed it, because
each read as a one-off. It is not.

## The evidence, in one table

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

Ten citations, eight rows, three handoffs, seven days. Nobody misread the
document. Nobody re-opened it. Each handoff re-cited exactly the elements its own
scope named and left the identical question unasked one row down the same table.

**The sharper half is the false prose a stale gap leaves behind.** Three
`hardware_entries.json` gap entries read `NAS6403 standard, absent from this
repo` / `NAS6404 standard absent` on 2026-08-10 — a claim about a file sitting in
`data/inbox/specs/`, in a repo whose worst-defect class is exactly a provenance
record making a false claim. They are corrected in this handoff, but only the
three a scoped handoff happened to touch.

**At least one more is live right now, and this issue is not the place to fix
it.** `hardware_entries.json:MS9363-09`'s gap says *"What is still missing is
entirely on the nut side: NUT HEIGHT, slot count, and slot depth"*, written
2026-08-04. `MS9363 Rev C.pdf` landed 2026-08-05, was read the same day into the
spec library, and — per `ARCHITECTURE.md`, "Known modelling gaps" — **gives nut
height, slot count and slot width**, plus slot-to-slot and slot-axis control. The
entry's gap has been describing a closed question for five days. (What that
reading *also* established is that the remaining phase gap is uncontrolled by any
standard, so the entry is not simply wrong — it is stale in a way that hides a
more interesting finding.) `JB_NAS77.pdf` and the two RBC plain-bearing PDFs are
named as candidates for `NAS77A4-015` and have never been opened at all.

## Why it matters

The repo's headline number is the traced ratio, and it is currently understated
by an unknown amount — not because anything is mislabelled, but because nobody
asks the pile whether it already answers an open gap. The gap lists say what
document *would* close each gap; the pile says what documents are *here*. Those
two lists have never been joined.

The 2026-08-06 correction found the ratio understated 4x. The mechanism there
(labels that were wrong) is now guarded by three tests. The mechanism here
(documents that arrived and were never revisited) is guarded by nothing, and
this issue's own table shows it firing four times in seven days.

## Suggested fix

A sweep, run as a debug tool and reported rather than enforced, because it
produces candidates a human must confirm — the scans have no text layer, so the
last step is always a rendered crop read by vision.

1. **Collect the open questions.** For every element instance across
   `ALL_STACK_FILES` with `confidence` in (`untraced`, `inferred`), and every
   `hardware_entries.json` entry whose `values_source.confidence` is not
   `traced`, take the `hardware_ref` / `standard` / `document`-named-in-the-gap.
2. **Collect the pile.** `ls data/inbox/specs/` (main checkout — gitignored, so
   the tool must skip rather than report empty in a worktree, the same way
   `test_provenance.py`'s cross-repo check skips).
3. **Join on the standard designator, not on the filename.** This is the whole
   trick and it is why the join is worth writing rather than eyeballing:
   `NAS6404U13D`'s gap said "NAS6404 absent" while the answering file is named
   `NAS6403-NAS6420 Rev 4.pdf`. A substring match on the filename finds nothing.
   A *range* match — parse `NAS<lo>-NAS<hi>` and test membership — finds it.
   Same shape for `MS9363 Rev C.pdf` vs `MS9363-09` / `MS9363-10`.
4. **Report, do not relabel.** Print `element -> candidate file`, and print the
   ones with no candidate too, because "still nothing here for NAS1149" is the
   other half of the answer and is what a spec-intake priority list is made of.
5. **Then decide whether it should fail.** A test that fires when a gap names a
   document now in the pile would be a real guard, but it needs the join to be
   trustworthy first and it needs an allowlist for "present but does not
   actually give this quantity" — which is a real category, not a hypothetical:
   NAS6403 is in the pile, `thread_transition`'s gap names it, and NAS6403 does
   **not** dimension the thread run-out (it gives `T (Ref)`, the whole thread
   region). A naive test would demand a re-citation that would be wrong.

Step 5's caveat is the reason this is filed as a tool first and a check second.

## Cost estimate

Small. Steps 1–2 are ten lines over data the repo already parses; step 3 is the
only interesting part. Sized like `debug_report_tolerance_stacks.py --ratio`,
which is the closest existing analogue and is the tool this repo gets the most
value per line from.
