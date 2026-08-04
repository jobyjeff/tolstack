# data/inbox/tolerance_stacks — provenance

Inbox stream for hand-built tolerance-stack source documents. Same rule as
`data/inbox/drawings/`: **copy in, never move or modify the original**, and the
contents are gitignored (this file and `.gitkeep` are the tracked skeleton).
Absence from git is not data loss — re-copy from the source below.

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
