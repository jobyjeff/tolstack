# data/inbox/drawings — provenance

Inbox stream for **part and assembly drawing PDFs** that stack elements cite.
Same rule as `data/inbox/tolerance_stacks/`: **copy in, never move or modify the
original**, and the contents are gitignored (this file and `.gitkeep` are the
tracked skeleton). Absence from git is not data loss — re-copy from the sources
below.

Created 2026-08-05 by handoff `hub_bearing_thermal_stack`, which is the first
stack in this repo to trace an element to a **part** drawing held here. Before
it, `data/inbox/tolerance_stacks/PROVENANCE.md` already referred to
"`data/inbox/drawings/`" as the model for its own rule — that reference was
dangling until this stream existed.

**Worktree reality (SOP trap 15):** `data/` is gitignored, so from a worktree
this directory holds only `PROVENANCE.md` and `.gitkeep`. The PDFs live in the
**main checkout** at `C:\workspace\tolstack\data\inbox\drawings\`. Read them
there; cite them as `data/inbox/drawings/<filename>` regardless.

## The upstream

Every file here is a **copy** of a PDF in drawing-checker's own drawings inbox,
`C:\workspace\drawing-checker\data\inbox\drawings\`, which is where Jeff drops
exports. That dependency is read-only and one-way (ARCHITECTURE.md): the
originals stay there, untouched, and sha256 was verified **identical on both
sides after each copy**.

A copy is taken rather than a reference because a drawing-checker inbox file is
not immutable — Jeff re-exports, and a printed zone expires between exports (SOP
Step 2). A citation in this repo has to name a file this repo can still open.

## Copied 2026-08-05 — the hub-bearing thermal-fit set

Pulled by Jeff into drawing-checker on 2026-08-05 for handoff
`hub_bearing_thermal_stack`; copied here the same day. Which part is which was
read off the **title blocks**, not inferred from the part number.

| file | drawing | rev | nomenclature (title block) | sha256 | bytes |
|---|---|---|---|---|---|
| `212966-006-A.pdf` | 212966-006 | A | PROPELLER HUB, DUAL BEARING GEN 5 | `b0c19da5a8cf992bf3ae31c3b589edb14e1d68347617964f2f847b0c219d0d6b` | 1,850,964 |
| `214955-004-A.pdf` | 214955-004 | A | HUB SPINDLE SLEEVE, LOWER, PROPELLER | `1dd02be3e2f6bc5e8cab36e5a7d0cb233b6df48b0e0a89f0f7dd4b27324a1544` | 380,648 |
| `214959-002-A.pdf` | 214959-002 | A | HUB SPINDLE BEARING SLEEVE, UPPER, PROPELLER | `f9eac183a4b4176275e28f930483261e48b8430b77096714027502c876a007ef` | 416,346 |
| `214589-002-A.pdf` | 214589-002 | A | BEARING, ANGULAR CONTACT, ID 160, OD 200 | `994f316665c82b6fe73c9b6f0c7affeca3e3692fc9d441f8404c2f646b9cc991` | 397,354 |
| `214588-002-A.pdf` | 214588-002 | A | BEARING, ANGULAR CONTACT, ID 95, OD 130 | `1943ac920776d129b80c3419fabc7f34a9e4aa71c8f5987112686156dd7793d7` | 363,622 |

All five carry `MATURITY STATE: Released`. Release dates from the title blocks:
212966-006 **30/Mar/2026**, 214955-004 **06/Apr/2026**, 214959-002
**27/JUN/2025**, both bearings **11/NOV/2025**. Both bearing sheets are marked
**SOURCE CONTROL DRAWING** (NSK vendor parts under a Joby number), which is why
neither states a material — see the CTE gaps in
`docs/tolerance_stacks/WORKSHEET_hub_bearing_thermal_fit.md`.

The two bearings pair with the two sleeves **by diameter, not by part-number
order**: the ID 160 / OD 200 bearing goes in the LOWER sleeve (bore ⌀200.000),
and the ID 95 / OD 130 bearing goes in the UPPER sleeve (bore ⌀129.968). See the
worksheet's identity section.

Re-copy:

```powershell
$src = "C:\workspace\drawing-checker\data\inbox\drawings"
$dst = "C:\workspace\tolstack\data\inbox\drawings"
foreach ($n in "212966-006-A.pdf","214955-004-A.pdf","214959-002-A.pdf",
               "214588-002-A.pdf","214589-002-A.pdf") {
    Copy-Item "$src\$n" "$dst\$n"
}
Get-ChildItem $dst -Filter *.pdf | ForEach-Object {
    "{0}  {1}" -f (Get-FileHash $_.FullName -Algorithm SHA256).Hash, $_.Name
}
```

## Copied 2026-09-16 — the released pitch plate

Copied by handoff `citation_identity_correctness`, which re-cited the three
grip stacks' 4.06 mm lug thickness off the `[PRELIM 2025-MAY-22] 215197 A.1`
export — a file that lives in **drawing-checker's test fixtures**, is over a
year older than the assembly export, and is not the released design. The
2026-09-15 audit (`docs/tolerance_stacks/AUDIT_20260915_full_pass.md`) found
that the released plate is a **different part number**: find 1 = `215735-001`
*PITCH PLATE, PROPELLER, CW* and find 4 = `215735-002` *PITCH PLATE, PROPELLER,
CCW* of the 215177 PITCH PLATE ASSEMBLY's own parts list (drawing-checker run
`20260813_180719_215177-A`). So this is not 215197 at a newer revision; it is
the drawing 215197 was superseded by.

Which part it is was read off the **title block**, not inferred from the part
number.

| file | drawing | rev | nomenclature (title block) | sha256 | bytes |
|---|---|---|---|---|---|
| `215735-A.pdf` | 215735 | A | PITCH PLATE, PROPELLER | `a06526c2682de7a91cd76e3aa9463b043f50061da316ccecbf544b46a921c004` | 522,823 |

`MATURITY STATE: Released`, `ENGINEERING CHANGE NOTICE ECN-215735-A`, release
date from the title block **01/JUL/2025**, CAGE code 6VX14, 2 sheets — sheet 1
`(SHT. DESC): OVERVIEW`, sheet 2 `(SHT. DESC): PART DETAILS`. **Sheet 2 carries
the only named view on either sheet, `SECTION A-A`**; sheet 1 carries none.

sha256 verified identical on both sides after the copy. Two drawing-checker runs
consumed this same file and both record this sha256 in their `run_meta.json`
inputs, so "which export" has a unique answer here:
`20260813_180734_215735-A` (ts `2026-08-14T01:07:56.112994+00:00`) and
`20260819_153213_215735-A` (ts `2026-08-19T22:32:36.201417+00:00`). Both record
`"purpose": "eager"` — drawing-checker's own publish policy wrote them, not a
request from this repo.

The three 4.06 callouts, re-read here 2026-09-16 and **not** carried across from
215197's addresses:

| callout | sheet | zone | cited by |
|---|---|---|---|
| `3X 4.06 ±0.08` | 2 (`SECTION A-A`) | B4 | `stack_tan_link_to_pitch_plate::pitch_plate_flange` |
| `5X 4.06 ±0.10` | 2 (`SECTION A-A`) | D10 | `stack_pitch_link_to_pitch_plate::pitch_plate_flange`, `stack_vpa_output_to_pitch_plate::pitch_flange_thickness` |
| `4.06 ±0.10` ×2 | 1 | D5 and D6 | — (the VPA element's unresolved alternatives) |

Two differences from 215197 A.1 worth knowing before comparing the sheets. Both
position frames lost their diameter symbol: the PRELIM printed `⌖⌀0.2 A B C` on
the 3X and 5X groups, the released sheet prints `⌖0.2 A B C`. And sheet 1 gained
a second `4.06 ±0.10`, at zone D6, where 215197 printed `8.80 ±0.10`.

Re-copy:

```powershell
$src = "C:\workspace\drawing-checker\data\inbox\drawings"
$dst = "C:\workspace\tolstack\data\inbox\drawings"
Copy-Item "$src\215735-A.pdf" "$dst\215735-A.pdf"
"{0}  {1}" -f (Get-FileHash "$dst\215735-A.pdf" -Algorithm SHA256).Hash, "215735-A.pdf"
```

## Reading these

They have a **text layer** — unlike the photocopied standards in
`data/inbox/specs/`, these can be searched rather than eyeballed. Use the
imported helper, from **drawing-checker's** `venv-win` (it needs PyMuPDF, which
this repo deliberately does not install):

```powershell
C:\workspace\drawing-checker\venv-win\Scripts\python.exe `
    tests\debug_trace_stack_values.py `
    "C:\workspace\tolstack\data\inbox\drawings\212966-006-A.pdf" `
    --pattern "202\.140" --context 130
```

`--crop "<page>,<cx>,<cy>,<half>" --zoom 6` renders a legible crop, and for these
drawings it is not optional: the text layer gives a dimension's *value* but not
what it measures. `1.190 ±0.025` and `1.110 ±0.035` sit side by side on
214955-004 sheet 1 and only the crop shows that the first is the **radial wall**
and the second is the **axial flange thickness**.
