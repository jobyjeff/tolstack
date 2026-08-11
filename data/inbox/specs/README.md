# data/inbox/specs — the spec and datasheet pile

Jeff's years-accumulated pile of fastener, hardware, material and process
specifications: NAS/MS/SAE/ASME/ASTM standards, Joby JPS process specs and JBM
manuals, and vendor datasheets. Many are **poor photocopies** — assume scans,
not text layers, until proven otherwise.

Moved here whole from `C:\workspace\drawing-checker\data\inbox\specs\` on
2026-08-03 by handoff `tolstack_founding` (42 files, 111,575,456 bytes; the old
location carries a `MOVED_TO_TOLSTACK.txt` breadcrumb). It had never been
consumed by anything in drawing-checker — spec intake belongs with the stacks
that cite it, not with the CATIA parser.

## The rules

1. **Append-only.** Drop new files in. That is the whole write interface.
2. **Never rename, reorganise, move, or clean up what is already here.** Not the
   opaque names (`GAELQIAAAAAAAAAA.pdf`, `PXJHJBAAAAAAAAAA.pdf` — download
   artifacts whose content still has to be identified by opening them), not the
   near-duplicates (`JPS00164.pdf` vs `JPS00164 Adhesive Bonding, General.pdf`;
   `AS4716.pdf` vs `SAE_AS4716_Glands_RevC (2).pdf`), not the `(1)`/`(2)`
   suffixes, not `desktop.ini`. Jeff's filenames are the index he navigates by;
   a tidy-up destroys that index and buys nothing. If two files look redundant,
   record *that* in a note — do not resolve it by deleting one.
3. **Contents are gitignored** (forge data convention: the filesystem is
   canonical for data). Absence from git is not data loss. This README is the
   tracked skeleton.
4. **Read-only for stack authoring.** An SOP-following agent cites files here; it
   never edits them.

## Why this folder is the point of the repo

Slice 1's headline finding was that only **5 of 26** element instances across
its three tolerance stacks could be traced to an actual document. The rest were
"the workbook says so", which is not a source. This pile is the trace target
that closes that gap — and it already holds the top-priority one:

> **Correction, 2026-08-06** (handoff `traced_labels_and_ratio`). This read
> *"1 of 17"* until 2026-08-06; neither number reproduced from the stacks. The
> definition of the ratio now lives in one place —
> `docs/SOP_TOLERANCE_STACK.md`, "The traced ratio" — and is computed by
> `tests\debug_report_tolerance_stacks.py --ratio`. Two of the three `traced`
> labels this correction touched were fixed **by this pile**:
> `NAS6403-NAS6420 Rev 4.pdf` sheet 3 turned out to cover both bolts, so the
> file below was already sitting here answering a question nobody had asked it.

> **Moved, 2026-08-10** (handoff `fastener_citations_and_confidence`), from
> 3 of 26 to 5 — and it is this folder's own recurring failure, stated plainly:
> **a document arriving here does not re-cite anything by itself, and nothing in
> the repo notices that it could.** `NAS6403-NAS6420 Rev 4.pdf` has been in this
> pile since founding. Sheet 3's grip/length table covers every dash number of
> every basic number in the family, so it answered *five* slice-1 gaps the day it
> landed. Four days and two handoffs later, three of them were still labelled
> "the workbook says so" — plus three `hardware_entries.json` entries carrying
> `NAS6403/NAS6404 standard absent`, which was false prose about a file sitting
> in this directory. Nobody misread the document; nobody re-opened it. The sweep
> that would catch this is one question asked periodically — *for every*
> `untraced`/`inferred` *element, is the document that would close it now in the
> pile?* — and it is filed as
> `docs/issues/ISSUE_20260810_nothing_sweeps_the_spec_pile_against_open_gaps.md`.

| slice-1 gap | file here |
|---|---|
| **NAS6403 / NAS6404** hex bolts — grip ±.010, thread run-out, cotter-hole position (blocked findings F7, F8, F16) | `NAS6403-NAS6420 Rev 4.pdf` |
| **MS9363** slotted / castellated nuts — nut height, slot count, slot depth: the check that governs every cotter-retained joint here | `MS9363 Rev C.pdf` — **landed 2026-08-05**, not yet read by any stack |
| **NAS77** plain bushing | `JB_NAS77.pdf`, `RBC - Plain bearings (NAS77 p92).pdf`, `RBC_Aerospace_Plain_Bearings_Web.pdf` |
| bolt/nut installation practice | `JPS00094 Process Specification — Installation of Bolts and Nuts.pdf` |
| bearing/bushing installation practice | `JPS00078 Installation of Bearings and Bushings.pdf` |
| interference fits | `JPS00176 Interference Fit Assembly.pdf` |

Still **not** here, and still blocking: **NAS1149** flat washers, **MS21299**
countersunk washers (re-confirmed absent 2026-08-06 — this is the one gap that
forced `vpa_output:under_head_chamfer_washer` down to `inferred`), **MS24665**
cotter pins, **MIL-S-8879** (the UNJF-3A thread form NAS6403 sheet 1 invokes,
which is what would close the thread run-out), and every Joby part drawing. See
the `gaps` lists in `docs/tolerance_stacks/hardware_entries.json`.

The pile grows (append-only), so treat the two lists above as a snapshot and the
counts in `PROVENANCE.md` as a record of the 2026-08-03 move. `ls` it before
concluding a document is absent — `MS9363` was on this paragraph's blocking list
until it landed on 2026-08-05.

A `source_ref` citing a file here uses `kind: "spec"`, the filename as
`document`, and a page number as `sheet` — see `docs/SOP_TOLERANCE_STACK.md`.
