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

Slice 1's headline finding was that **1 of 17** element instances across three
tolerance stacks could be traced to an actual document. The rest were "the
workbook says so", which is not a source. This pile is the trace target that
closes that gap — and it already holds the top-priority one:

| slice-1 gap | file here |
|---|---|
| **NAS6403 / NAS6404** hex bolts — grip ±.010, thread run-out, cotter-hole position (blocked findings F7, F8, F16) | `NAS6403-NAS6420 Rev 4.pdf` |
| **NAS77** plain bushing | `JB_NAS77.pdf`, `RBC - Plain bearings (NAS77 p92).pdf`, `RBC_Aerospace_Plain_Bearings_Web.pdf` |
| bolt/nut installation practice | `JPS00094 Process Specification — Installation of Bolts and Nuts.pdf` |
| bearing/bushing installation practice | `JPS00078 Installation of Bearings and Bushings.pdf` |
| interference fits | `JPS00176 Interference Fit Assembly.pdf` |

Still **not** here, and still blocking: **MS9363** slotted/castellated nuts
(slot count and depth — the check that actually governs both seeded joints),
**NAS1149** flat washers, **MS21299** countersunk washers, **MS24665** cotter
pins, and every Joby part drawing. See the `gaps` lists in
`docs/tolerance_stacks/hardware_entries.json`.

A `source_ref` citing a file here uses `kind: "spec"`, the filename as
`document`, and a page number as `sheet` — see `docs/SOP_TOLERANCE_STACK.md`.
