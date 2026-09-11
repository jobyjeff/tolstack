---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-10 — viewer_rebuild_affordance: the stale-data banner stops printing terminal commands (which were broken anyway)

Source: Jeff's atomic note `20260910T145751_o146d8` (2026-09-10). He hit the
viewer's stale-projection banner ("Data is older than the latest code — needs
a rebuild … built from a tree 9 commit(s) behind master") and it told him to
copy/paste terminal commands. Two failures: (1) the pasted text concatenated
TWO commands onto one line
(`venv-win\Scripts\python.exe scripts\build_topology_projection.py
C:\workspace\drawing-checker\venv-win\Scripts\python.exe
scripts\build_viewer_crops.py` — note it even mixes in a drawing-checker
interpreter path), which PowerShell rejects outright; (2) per Jeff, now a
binding cross-repo UI rule: "putting terminal commands in a webui for the
user to copy/paste is not acceptable UI design … exceptions … need to be
approved by user on a case by case basis." Baseline: current trunk + the
merged `viewer_error_surface_and_layout` (which owns the banner) — coordinate
with the pending integration→master state; if the banner code is
integration-only, branch from integration as usual. Scope: the viewer's
staleness banner + transport capability plumbing (`apps/viewer/`); do NOT
build the server-side rebuild endpoint (owned by drawing-checker
`tolstack_mount_rebuild_endpoint`, staged the same day) — only call it if the
transport reports it.

## Deliverables

1. **The banner never shows commands.** Replace the command text with:
   - **Served mode, rebuild capability present** (the transport probe pattern
     from `viewer_http_transport`; capability = the d-c mount's rebuild
     endpoint, `POST /tolstack/rebuild` or whatever
     `tolstack_mount_rebuild_endpoint` ships — probe, don't hardcode
     availability): a **Rebuild** button. Click → endpoint → progress state →
     reload data on success; failure shows a plain-words error (no paths, no
     commands).
   - **Static/file:// mode or no capability**: one plain sentence — the data
     is older than the code and needs a rebuild — nothing else. No commands,
     no file paths, no module names.
2. **Fix the underlying banner-text bug** as evidence for the lesson: the two
   rebuild commands were joined without a separator (and the second lost its
   interpreter prefix). Even though commands no longer render, the source of
   that string may feed logs/docs — correct it where it lives.
3. **Keep the staleness detection exactly as is** — the provenance gate is
   right and load-bearing; this handoff changes only what the user is shown
   and given to do about it.

## Definition of done

- Browser-tier test (real-data tier per `viewer_error_surface_and_layout`'s
  contract): stale projection + capability → button renders, click path
  exercised against a stub endpoint; stale + no capability → the one-sentence
  state; fresh data → no banner. No command/path strings anywhere in
  user-facing copy (assert on rendered text).
- Full suite green (JS + pytest tiers).
- Lesson (`docs/sessions/lessons/LESSONS_20260910_viewer_rebuild_affordance.md`):
  where the broken command string came from, the capability-probe shape agreed
  with the d-c endpoint handoff.
