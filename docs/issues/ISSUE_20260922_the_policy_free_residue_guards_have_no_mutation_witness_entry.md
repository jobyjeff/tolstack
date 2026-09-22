---
type: chore
priority: med
status: open
area: scripts/mutation_witnesses
reporter: agent
found_by: docs/sessions/HANDOFF_20260921_policy_free_brief_residues.md
---

# Four guards from `policy_free_brief_residues` have no mutation-witness entry

`HANDOFF_20260921_policy_free_brief_residues` added four guards and did not
touch `scripts/mutation_witnesses.json` — `HANDOFF_20260921_mutation_witness_
enrollment_backlog` was **active in a sibling worktree** for the whole session,
so two agents editing that one table would have collided.

This is filed as an issue rather than left in the lesson on purpose. The
precedent is `ISSUE_20260918_thirteen_new_guards_have_no_mutation_witness_and_
their_enrolling_handoff_closed`: `reader_facing_surfaces_second_pass` was told
to *name its new guards in its lesson for the enrolling handoff to read*, that
handoff reached `completed/` first, and thirteen rows lost their owner. A lesson
is a place nothing schedules anyone to read; an issue is not.

Each row below already carries the `find`/`replace` shape an entry needs,
because both were **measured in-session** by planting the defect back and
watching the guard go red — so enrolling them is transcription, not design.

## The four

| guard | tier / suite | measured mutation |
|---|---|---|
| `no banner state prints a terminal command, a repo path, a field name or a checksum at the reader` (`apps/viewer/tests.js`) | `fast` | In `apps/viewer/views/banner.js`, `find`: `root.appendChild(missing(labels.missing));` → `replace`: the same line with `+ " Build it: venv-win/Scripts/python.exe scripts/build_viewer_projection.py"` inside `missing(...)`. Measured red on the shared shape ban (`"python.exe"`). |
| `this app holds no terminal command for a surface to render` (`apps/viewer/tests.js`) | `fast` | In `apps/viewer/config.js`, `find`: `    drawingCheckerWebui:` → `replace`: `    rebuild: { results: "x" },\n    drawingCheckerWebui:`. Measured red on `VA.CONFIG.rebuild is back`. Note this guard has TWO independent halves (the `VA.CONFIG` probe and the static `codeOnly(src)` scan of seven view files); a second entry planting `VA.CONFIG.rebuild.results` into a view without re-adding the table would witness the other half. |
| `a loopback page in a browser WITH File System Access asks for the folder, and says nothing about the API` (`scripts/run_viewer_browser_tests.mjs`) | `browser`, suite `annotate hosted posture (no folder grant off-machine)` | Not a source mutation — this one is witnessed by mutating the **environment**: `page.addInitScript(() => { delete window.showDirectoryPicker; })` before the loopback `goto`, with the capability read forced truthy. Measured 17/18, where the retired disjunction passed. Whether the table can express an environment mutation at all is the open question here; if it cannot, say so in the entry's `note` rather than leaving the guard silently unenrolled. |
| the twin of the above in `testAnnotateFlyout` (same file) | `browser`, suite `annotate flyout (repo-root mount + file:// degradation)` | Same shape, read off the iframe's `contentWindow` instead of the page's. |

## Also worth a row, and cheaper than the four above

`apps/viewer/reader_facing_bans.js`'s new script-filename **shape**
(`/\b[\w.-]+\.(?:py|exe|ps1|bat|cmd|sh)\b/`) replaced the single literal
`build_viewer_crops.py`. Reverting the shape back to that literal is a
one-line `find`/`replace` that should redden the banner walk, and it witnesses
the widening rather than any one call site — which is the claim that actually
matters, since four live command sites passed the literal list for as long as
it existed.
