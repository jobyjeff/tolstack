# data/inbox/tolerance_stacks — provenance

Inbox stream for hand-built tolerance-stack source documents. Same rule as
`data/inbox/drawings/`: **copy in, never move or modify the original**, and the
contents are gitignored (this file and `.gitkeep` are the tracked skeleton).
Absence from git is not data loss — re-copy from the sources below.

Two workbooks so far, and they are **different archetypes**, not two examples of
one: `260729_sample_tol_stack.xlsx` is a linear grip-length stack,
`260209_Hub Bearing Fits.xlsx` is a two-stage diametral thermal fit. See
`docs/tolerance_stacks/ARCHETYPE_thermal_fit.md`.

## 260729_sample_tol_stack.xlsx

| | |
|---|---|
| Source | `C:\workspace\forge\data\inbox\atomic-notes\attachments\20260729T173648_qjk2xk\260729_sample_tol_stack.xlsx` |
| Forge atomic note | `20260729T173648_qjk2xk` |
| Author | Jeff Cortes (workbook metadata) |
| sha256 | `51b6c5362848758aaeebd8281f96e1ba4786abbeb40642b94e7f98bffecd6fd1` |
| Size | 113,156 bytes |
| Copied into drawing-checker | 2026-07-30, handoff `tolerance_stack_slice1` |
| Copied into **tolstack** | 2026-08-03, handoff `tolstack_founding`, from `C:\workspace\drawing-checker\data\inbox\tolerance_stacks\` (drawing-checker `master` at `0743640`). sha256 **re-verified identical** after this second hop. |

The forge attachment is **immutable** — treat both it and this copy as
read-only. One sheet, `grip length tols old`, holding three grip-length stacks
plus an embedded CAD cross-section screenshot (`xl/media/image1.png`) of the
tangential-link joint.

Re-copy from the immutable forge attachment (preferred — it is the origin):

```powershell
Copy-Item "C:\workspace\forge\data\inbox\atomic-notes\attachments\20260729T173648_qjk2xk\260729_sample_tol_stack.xlsx" `
          "data\inbox\tolerance_stacks\"
```

Verify afterwards:

```powershell
(Get-FileHash "data\inbox\tolerance_stacks\260729_sample_tol_stack.xlsx" -Algorithm SHA256).Hash
# expect 51B6C5362848758AAEEBD8281F96E1BA4786ABBEB40642B94E7F98BFFECD6FD1
```

Read it with `tests/debug_dump_tol_stack_xlsx.py` (stdlib zip + XML — prints
formulas *and* cached values; no openpyxl needed). The transcription lives in
`docs/tolerance_stacks/`.

## 260209_Hub Bearing Fits.xlsx

| | |
|---|---|
| Source | dropped **directly** into `C:\workspace\tolstack\data\inbox\tolerance_stacks\` by Jeff, 2026-08-04 (file mtime `2026-08-04 17:23:29`) |
| Forge atomic note | `20260804T173624_vwb8ia` — announces the drop in prose; its `attachments` array is **empty**, so there is no immutable forge copy to re-derive this one from |
| Author | Jeff Cortes |
| sha256 | `be373ff1c0c721c71f0dd658adce226cb74998aa1448978d6176a9ca06ef93d1` |
| Size | 44,421 bytes |
| Transcribed by | handoff `hub_bearing_thermal_stack`, 2026-08-05 |

**This one has no immutable upstream.** The 260729 workbook can always be
re-copied from a forge atomic-note attachment; this one cannot — the note that
announces it carries no attachment, and the only copy is the one in the main
checkout. If it is lost, it is lost. That asymmetry is why the sha256 above is
worth having and why the re-derivation harness
(`tests/test_hub_bearing_rederivation.py`) hard-codes every cached cell value it
checks: the numbers survive in git even if the workbook does not.

Verify:

```powershell
(Get-FileHash "C:\workspace\tolstack\data\inbox\tolerance_stacks\260209_Hub Bearing Fits.xlsx" -Algorithm SHA256).Hash
# expect BE373FF1C0C721C71F0DD658ADCE226CB74998AA1448978D6176A9CA06EF93D1
```

Three sheets: `260209_Hub wear ring shrink M2` (M2/TC intent design),
`260209_Hub wear ring shrink M1` (M1 as-built), and `Decision Matrix` (a
schedule-impact matrix for the M2 change — prose and week counts, no dimensions,
**not** transcribed). Each shrink sheet holds two independent two-stage fits, the
**lower** hub bore (rows 12–27) and the **upper** hub bore (rows 29–44), each
evaluated over 3 fit columns × 3 temperatures. Sheet order is M2 first, M1
second — reverse chronological, which is a trap when skimming.

Watch for **shared formulas** (`<f t="shared" si="…"/>`), which read as empty to
the dump tool: rows 17, 18, 21, 35, 36 and 39 use them heavily in the Hot and
Cold column groups, so those cells print as `==  -> <value>`. The value is
cached and correct; the formula has to be inferred from the pattern, which is
exactly what the re-derivation checks.
